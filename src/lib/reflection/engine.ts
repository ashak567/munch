import { GoogleGenerativeAI } from '@google/generative-ai';
import { serverEnv } from '@/lib/env';
import {
  CognitiveEngine,
  CognitiveTrace,
  ContextPackage,
  StructuredReflection,
  PathCandidate
} from './types';
import { runNLUPipeline } from '../nlu/pipeline';
import { resolveNLUObservations } from '../nlu/resolver';
import { getFallbackObservationsForAgent } from '../orchestrator/agents';
import { MascotCharacter, MascotExpression } from '@/components/Mascot';
import { EmotionEngine } from '../emotion/engine';

// Initialize the Gemini API client safely
const getGenAI = () => {
  const apiKey = serverEnv.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'MOCK_KEY') return null;
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Runner that executes a registered array of cognitive engines in sequence.
 */
export async function runCognitivePipeline(
  engines: CognitiveEngine[],
  initialTrace: CognitiveTrace,
  context: ContextPackage
): Promise<CognitiveTrace> {
  let currentTrace = { ...initialTrace };
  for (const engine of engines) {
    try {
      currentTrace = await engine.execute(currentTrace, context);
    } catch (err) {
      console.error(`[CognitivePipeline] Engine "${engine.name}" failed:`, err);
    }
  }
  return currentTrace;
}

/**
 * Deterministically extracts path candidates from user input.
 * Uses Gemini for parsing and falls back to rule-based keyword splitting.
 */
export async function extractPathsFromText(
  userInput: string,
  chatHistory: string[] = []
): Promise<PathCandidate[]> {
  const genAI = getGenAI();
  if (!genAI) {
    return getFallbackPaths(userInput);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `
Analyze the user's message (and conversation history if relevant) to extract possible paths, choices, or things they could try that they are stuck between or considering.
For example, if they say "I don't know whether to order pizza or make a salad", return the two options.
If no paths/options are mentioned, return an empty list.

User Message: "${userInput}"
History: ${JSON.stringify(chatHistory)}

Output JSON schema:
{
  "paths": [
    {
      "text": "The path or choice (e.g. 'Order pizza')",
      "tags": ["lowercase", "tags", "describing", "the", "path"]
    }
  ]
}
`;

  try {
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed && Array.isArray(parsed.paths)) {
      return parsed.paths;
    }
    return [];
  } catch (err) {
    console.warn('[PathExtraction] Gemini path extraction failed, falling back:', err);
    return getFallbackPaths(userInput);
  }
}

function getFallbackPaths(userInput: string): PathCandidate[] {
  const parts = userInput.split(/\bor\b|\bvs\b/i);
  if (parts.length >= 2) {
    return parts.map(p => ({
      text: p.trim().replace(/^[,\.\s\?\!]+|[,\.\s\?\!]+$/g, ''),
      tags: ['fallback']
    }));
  }
  return [];
}

/**
 * NLU Engine Plugin.
 * Runs the Layer 1 NLU Pipeline and resolves observations, then extracts possible paths.
 */
export class NluEnginePlugin implements CognitiveEngine {
  public name = 'NLU Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    // 1. Run core NLU pipeline
    const rawAnalysis = await runNLUPipeline(context);

    // 2. Resolve observations using the resolver
    // Mock history empty array for the resolver call
    const resolved = resolveNLUObservations(rawAnalysis, context as any, []);

    // 3. Save observations back into the context so downstream engines can access them
    context.observations = context.observations || [];
    
    // Map properties from resolved to AgentObservation format
    const mappings: Array<{ key: keyof typeof resolved; label: string }> = [
      { key: 'state_signals', label: 'state_signals' },
      { key: 'certainties', label: 'certainties' },
      { key: 'goals', label: 'goals' },
      { key: 'ambiguities', label: 'ambiguities' },
      { key: 'readiness_signals', label: 'readiness_signals' }
    ];

    for (const map of mappings) {
      const items = resolved[map.key] as any[];
      if (items && items.length > 0) {
        context.observations.push({
          agent_name: 'NLU Agent',
          type: 'nlu',
          key: map.key,
          value: items,
          confidence: Math.max(...items.map((i: any) => i.confidence || 0.8)),
          reasoning: `Resolved ${items.length} ${map.label} from pipeline.`
        });
      }
    }

    // 3.5 Fallback / Resolve category
    const categoryExists = context.observations.some((o: any) => o.key === 'detected_category');
    if (!categoryExists) {
      let category = 'Other';
      const inputLower = context.user_input.toLowerCase();
      if (/pizza|sushi|pasta|burger|food|eat|dinner|lunch|breakfast|restaurant/i.test(inputLower)) {
        category = 'Food';
      } else if (/movie|film|netflix|show|watch|game|youtube|music|book/i.test(inputLower)) {
        category = 'Entertainment';
      } else if (/run|gym|work|study|code|read|sleep|clean/i.test(inputLower)) {
        category = 'Activities';
      } else if (/buy|shop|clothes|shoes|amazon|gadget/i.test(inputLower)) {
        category = 'Shopping';
      }
      context.observations.push({
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'detected_category',
        value: category,
        confidence: 0.8,
        reasoning: 'Fallback classification based on user input.'
      });
    }

    // 4. Extract possible paths
    const historyStrings = (context.chatHistory || []).map((m: any) => m.content);
    const extractedPaths = await extractPathsFromText(context.user_input, historyStrings);

    // 5. Progressive Path Evolution: merge new paths with accumulated paths in metadata
    let currentPaths = [...(trace.generatedPaths || [])];
    if (extractedPaths.length > 0) {
      // Avoid duplicate paths
      extractedPaths.forEach(newP => {
        const duplicate = currentPaths.some(p => p.text.toLowerCase() === newP.text.toLowerCase());
        if (!duplicate) {
          currentPaths.push(newP);
        }
      });
    }

    return {
      ...trace,
      generatedPaths: currentPaths
    };
  }
}

/**
 * Emotion Engine Plugin.
 * Analyzes current input and NLU observations to determine active emotions.
 * Delegates to the modular EmotionEngine.
 */
export const EmotionEnginePlugin = EmotionEngine;

/**
 * Mascot Specialist Engine.
 * Decides which mascot should voice the output based on trace observations.
 */
export class MascotSpecialistEngine implements CognitiveEngine {
  public name = 'Mascot Specialist Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    let mascot: MascotCharacter = 'munch';
    let reason = 'Default balanced guide';
    const dominantEmotion = trace.emotions[0] || 'calm';

    const guidance = trace.emotionalGuidance;
    if (guidance) {
      const style = guidance.responseStyle;
      if (style === 'comfort') {
        mascot = 'pandy';
        reason = 'Mascot assigned comfort response style: Pandy specializes in comfort and rest';
      } else if (style === 'ground') {
        mascot = 'froggy';
        reason = 'Mascot assigned ground response style: Froggy specializes in calm';
      } else if (style === 'encourage') {
        mascot = 'dobby';
        reason = 'Mascot assigned encourage response style: Dobby specializes in encouragement';
      } else if (style === 'celebrate') {
        mascot = 'chicky';
        reason = 'Mascot assigned celebrate response style: Chicky specializes in optimism and celebration';
      } else if (style === 'clarify' || style === 'reflect') {
        mascot = 'ollie';
        reason = 'Mascot assigned clarify/reflect response style: Ollie specializes in perspective';
      }
    } else {
      // Assign mascot based on legacy specialty
      if (dominantEmotion === 'tired' || dominantEmotion === 'exhausted' || dominantEmotion === 'sad') {
        mascot = 'pandy';
        reason = 'Dominant fatigue or sadness: Pandy specializes in comfort and rest';
      } else if (dominantEmotion === 'anxious' || dominantEmotion === 'worry' || dominantEmotion === 'unsure') {
        mascot = 'ellie';
        reason = 'Dominant anxiety or doubt: Ellie specializes in emotional safety and reassurance';
      } else if (dominantEmotion === 'overwhelmed' || dominantEmotion === 'busy') {
        mascot = 'froggy';
        reason = 'Dominant overload or stress: Froggy specializes in calm';
      } else if (dominantEmotion === 'happy' || dominantEmotion === 'joyful') {
        mascot = 'chicky';
        reason = 'Dominant joy: Chicky specializes in optimism and celebration';
      } else if (trace.state === 'Clarifying' || dominantEmotion === 'reflective') {
        mascot = 'ollie';
        reason = 'Active reflection or clarifying: Ollie specializes in perspective';
      } else if (trace.state === 'Exploring' && /action|energy|start/i.test(context.importance || '')) {
        mascot = 'dobby';
        reason = 'Action-oriented exploration: Dobby specializes in encouragement';
      }
    }

    // Bind expression
    let expression: MascotExpression = 'idle';
    if (trace.state === 'Clarifying' || trace.state === 'Understanding') {
      expression = 'think';
    } else if (dominantEmotion === 'joyful' || trace.state === 'Choosing') {
      expression = 'happy';
    } else if (dominantEmotion === 'tired' || dominantEmotion === 'anxious') {
      expression = 'wry';
    }

    return {
      ...trace,
      mascotCharacter: mascot,
      mascotExpression: expression,
      mascotReason: reason
    };
  }
}

/**
 * Deterministic Reflection Engine.
 * Converts raw context and cognitive observations into structured, gentle reflections.
 */
export class ReflectionEngine implements CognitiveEngine {
  public name = 'Reflection Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    const reflections: StructuredReflection[] = [];

    // Helper to search NLU observations in context
    const getObservationsOfAgent = (agentName: string, key: string): any[] => {
      const obs = context.observations || [];
      return obs.filter((o: any) => o.agent_name === agentName && o.key === key);
    };

    // 1. Analyze Inferred Emotions from Trace
    const emotionalState = trace.emotionalState;
    const dominantEmotion = emotionalState ? emotionalState.primaryEmotion : (trace.emotions && trace.emotions.length > 0 ? trace.emotions[0] : null);

    if (dominantEmotion) {
      let reflectionText = '';
      let confidence = emotionalState ? emotionalState.confidence : 0.8;

      if (dominantEmotion === 'tired' || dominantEmotion === 'exhausted') {
        reflectionText = "I wonder if your energy is running a bit lower than usual today.";
      } else if (dominantEmotion === 'overwhelmed' || dominantEmotion === 'busy') {
        reflectionText = "I notice there's a lot of noise or demands around you right now.";
      } else if (dominantEmotion === 'anxious' || dominantEmotion === 'worry' || dominantEmotion === 'unsure') {
        reflectionText = "I wonder if there is a bit of hesitation or uncertainty underneath these choices.";
      } else if (dominantEmotion === 'joyful' || dominantEmotion === 'happy') {
        reflectionText = "It sounds like you're carrying a lighthearted or bright energy right now.";
      } else if (dominantEmotion === 'reflective') {
        reflectionText = "It seems you are taking some gentle space to ponder what feels right.";
      }

      if (reflectionText) {
        reflections.push({
          observation: `Dominant emotion detected as ${dominantEmotion}.`,
          reflection: reflectionText,
          confidence,
          type: 'emotion'
        });
      }
    }

    // Add reflection for conflicted emotional consistency if detected
    if (emotionalState && emotionalState.emotionalConsistency === 'conflicted') {
      reflections.push({
        observation: `Emotional state is conflicted (stability: ${emotionalState.stability.toFixed(2)}).`,
        reflection: "I notice a bit of a shift or some conflicting feelings in how you are feeling right now.",
        confidence: emotionalState.confidence,
        type: 'conflict'
      });
    }

    // 2. Analyze NLU State Signals (like cognitive fatigue or overload)
    const nluStateObs = getObservationsOfAgent('NLU Agent', 'state_signals');
    if (nluStateObs.length > 0 && Array.isArray(nluStateObs[0].value)) {
      const signals = nluStateObs[0].value.map((s: any) => s.signal);
      if (signals.includes('cognitive_fatigue') || signals.includes('mental_overload')) {
        reflections.push({
          observation: "NLU detected cognitive fatigue or mental overload.",
          reflection: "It feels like your mind has been working extra hard recently.",
          confidence: 0.85,
          type: 'energy'
        });
      }
    }

    // 3. Analyze Conflicts or Ambiguities
    const hasConflicts = context.conflicts && context.conflicts.length > 0;
    const nluAmbiguityObs = getObservationsOfAgent('NLU Agent', 'ambiguities');
    const hasAmbiguities = nluAmbiguityObs.length > 0 && Array.isArray(nluAmbiguityObs[0].value) && nluAmbiguityObs[0].value.length > 0;

    if (hasConflicts) {
      reflections.push({
        observation: "Orchestrator identified conflicting hypotheses in decision pathways.",
        reflection: "I wonder if you're feeling pulled in two different directions at the same time.",
        confidence: 0.88,
        type: 'conflict'
      });
    } else if (hasAmbiguities) {
      reflections.push({
        observation: "NLU identified ambiguities in options or intent.",
        reflection: "It seems like the path forward is still taking shape and isn't fully clear yet.",
        confidence: 0.78,
        type: 'conflict'
      });
    }

    // 4. Analyze Paths and Options
    if (trace.generatedPaths && trace.generatedPaths.length > 0) {
      const pathTexts = trace.generatedPaths.map(p => p.text);
      let desc = '';
      if (pathTexts.length === 1) {
        desc = `I hear you considering the path of "${pathTexts[0]}".`;
      } else if (pathTexts.length === 2) {
        desc = `It sounds like you are weighing between "${pathTexts[0]}" and "${pathTexts[1]}".`;
      } else {
        desc = `I notice a few possible directions on your mind, like "${pathTexts[0]}" or "${pathTexts[1]}".`;
      }

      reflections.push({
        observation: `Identified ${pathTexts.length} paths under consideration.`,
        reflection: desc,
        confidence: 0.92,
        type: 'path'
      });
    }

    // 5. Default General Reflection if none generated
    if (reflections.length === 0) {
      reflections.push({
        observation: "Standard greeting context.",
        reflection: "I am right here with you, listening to what's unfolding.",
        confidence: 0.7,
        type: 'general'
      });
    }

    // Return the updated trace
    return {
      ...trace,
      reflections
    };
  }
}
