import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { serverEnv } from '@/lib/env';
import { MunchContextBuilder } from '@/lib/context/builder';
import { runCognitivePipeline, NluEnginePlugin, EmotionEnginePlugin, MascotSpecialistEngine, ReflectionEngine } from '@/lib/reflection/engine';
import { DecisionReadinessEngine } from '@/lib/reflection/readiness';
import { CognitiveTrace, ContextPackage } from '@/lib/reflection/types';
import { analyzeTopics } from '@/lib/context/builder';
import { EmotionalStateEngine } from '@/lib/emotion/state';
import { EmotionRegulationEngine } from '@/lib/emotion/regulation';
import { EmotionDynamicsEngine } from '@/lib/emotion/dynamics';

// Initialize Gemini safely
const getGeminiModel = () => {
  const apiKey = serverEnv.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'MOCK_KEY') return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 250
    }
  });
};

/**
 * Gemini Voice Narrator.
 * Gemini serves strictly as the narrator (the voice) for Munch, translating the
 * deterministic Structured Reflections from the Cognitive Trace into warm mascot dialogue.
 */
async function generateMascotVoice(
  trace: CognitiveTrace,
  context: ContextPackage
): Promise<string> {
  const model = getGeminiModel();
  if (!model) {
    // Fallback dialogue if Gemini is offline
    const refls = trace.reflections.map(r => r.reflection).join(' ');
    return `[${trace.mascotCharacter}] ${refls} What else is on your mind?`;
  }

  const nickname = context.user_nickname || 'friend';
  const prompt = `
You are the voice (narrator) for Munch's mascot specialist: '${trace.mascotCharacter}'.
Munch is a gentle decision companion for ${nickname}.

SPECIALIST PERSONALITY:
- 'pandy': Comfort & Rest (cozy warmth, gentle, panda mascot)
- 'ollie': Reflection & Perspective (thoughtful, patient owl mascot)
- 'dobby': Encouragement & Confidence (motivating, active dog mascot)
- 'ellie': Emotional Safety & Reassurance (comforting, calming elephant mascot)
- 'chicky': Optimism & Celebration (happy, joyful chick mascot)
- 'munch': Balanced Guidance (default clover guide)

STATE CONTEXT:
- Conversation State Machine Stage: "${trace.state}"
- User Input: "${context.user_input}"
- Active Topic: "${trace.activeTopicKey}"

DETERMINISTIC COGNITIVE OBSERVATIONS (REFLECTION ENGINE OUTPUT):
These are the ground truths computed by our reasoning layer. You MUST voice these reflections:
${trace.reflections.map((r, i) => `${i + 1}. [Observation: ${r.observation}] Reflection: "${r.reflection}" (Confidence: ${r.confidence})`).join('\n')}

INSTRUCTIONS:
1. Speak strictly using the specialist's voice and personality.
2. Your ONLY job is to express the deterministic reflections above naturally, with flow, warmth, and ease.
3. NEVER make up independent diagnoses, never exaggerate the relationship, and never invent facts.
4. Keep the response concise: target 1 to 3 sentences (40-80 words).
5. Never mention terms like "AI", "algorithm", "readiness score", "threshold", "reflection engine", or "NLU". Focus entirely on natural, warm human connection.

Mascot response:
`;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (err) {
    console.error('[GeminiVoice] Failed to generate mascot voice response:', err);
    const refls = trace.reflections.map(r => r.reflection).join(' ');
    return `[${trace.mascotCharacter}] ${refls} How are you holding up?`;
  }
}

/**
 * Periodic Conversation Summarizer.
 * Summarizes the emotional arc and observations after 20-30 message turns.
 */
async function generateConversationSummary(
  chatId: string,
  userId: string,
  messages: any[]
): Promise<void> {
  const model = getGeminiModel();
  if (!model) return;

  const prompt = `
Analyze the following chat history and summarize:
1. A brief summary of the conversation.
2. The emotional arc (e.g. from stressed to calm).
3. Discovered interests or tags (e.g. comfort food).
4. Unresolved conflicts/dilemmas.
5. Decisions made or contemplated.

Chat History:
${messages.map(m => `${m.sender === 'user' ? 'User' : m.mascot_character}: ${m.content}`).join('\n')}

Output must follow this JSON schema:
{
  "summary": "Summary of the conversation",
  "emotional_arc": ["list", "of", "emotions", "felt"],
  "discovered_interests": ["tags", "or", "interests"],
  "unresolved_conflicts": ["any", "remaining", "conflicts"],
  "decisions_made": ["decisions", "selected"]
}
`;

  try {
    const response = await model.generateContent(prompt);
    const parsed = JSON.parse(response.response.text().trim());

    const supabase = await createClient();
    await supabase.from('conversation_summaries').insert({
      chat_id: chatId,
      summary: parsed.summary,
      emotional_arc: parsed.emotional_arc || [],
      discovered_interests: parsed.discovered_interests || [],
      unresolved_conflicts: parsed.unresolved_conflicts || [],
      decisions_made: parsed.decisions_made || []
    });

    // Extract memory candidates
    if (parsed.summary && parsed.summary.length > 10) {
      await supabase.from('memory_candidates').insert({
        user_id: userId,
        summary: `Munch noticed during a chat: ${parsed.summary}`,
        status: 'pending'
      });
    }
  } catch (err) {
    console.error('[Summarizer] Failed to summarize conversation:', err);
  }
}

// GET API endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Fetch active chat
    let { data: activeChat } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    // 2. If no active chat, initialize one
    if (!activeChat) {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          status: 'active',
          state: 'Listening',
          metadata: {
            activeTopicKey: 'general',
            branches: {
              general: { state: 'Listening', paths: [], mascot: 'munch' }
            }
          }
        })
        .select()
        .single();

      if (chatError) throw chatError;
      activeChat = newChat;

      // Insert default welcome message
      await supabase.from('chat_messages').insert({
        chat_id: activeChat.id,
        sender: 'mascot',
        content: "What's on your mind today? I'm here to listen.",
        mascot_character: 'munch',
        mascot_expression: 'idle'
      });
    }

    // 3. Load chat messages
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', activeChat.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      chat: activeChat,
      messages: messages || []
    });
  } catch (error: any) {
    console.error('GET /api/chat failed:', error);
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}

// POST API endpoint
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content cannot be empty.' }, { status: 400 });
    }

    // 1. Retrieve active chat
    let { data: activeChat } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!activeChat) {
      // Create new chat
      const { data: newChat } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          status: 'active',
          state: 'Listening',
          metadata: {
            activeTopicKey: 'general',
            branches: {
              general: { state: 'Listening', paths: [], mascot: 'munch' }
            }
          }
        })
        .select()
        .single();
      activeChat = newChat;
    }

    const chatMetadata = activeChat.metadata || {};
    let activeTopicKey = chatMetadata.activeTopicKey || 'general';
    const branches = chatMetadata.branches || {};

    // 2. Interrupt Handling: Detect topic switches
    const topicAnalysis = await analyzeTopics(content);
    const topics = topicAnalysis.active_topics || [];
    let targetTopicKey = 'general';

    if (topics.includes('food')) {
      targetTopicKey = 'food';
    } else if (topics.includes('career') || topics.includes('job') || topics.includes('finances')) {
      targetTopicKey = 'career';
    } else if (topics.includes('study') || topics.includes('academic') || topics.includes('exam')) {
      targetTopicKey = 'study';
    }

    if (targetTopicKey !== activeTopicKey) {
      // Pause current topic branch in metadata
      branches[activeTopicKey] = {
        state: activeChat.state || 'Listening',
        paths: chatMetadata.possiblePaths || [],
        mascot: chatMetadata.lastMascot || 'munch'
      };

      // Create or resume target branch
      const resumedBranch = branches[targetTopicKey] || {
        state: 'Listening',
        paths: [],
        mascot: 'munch'
      };

      activeTopicKey = targetTopicKey;
      activeChat.state = resumedBranch.state;
      chatMetadata.possiblePaths = resumedBranch.paths;
      chatMetadata.lastMascot = resumedBranch.mascot;
    }

    // 3. Save User message to Database
    const { data: userMessage } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: activeChat.id,
        sender: 'user',
        content: content.trim()
      })
      .select()
      .single();

    // 4. Fetch last 10 messages for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', activeChat.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const chatHistory = (recentMessages || []).reverse();

    // 5. Build context package
    const contextBuilder = new MunchContextBuilder();
    const context = await contextBuilder.buildContext({
      user_id: user.id,
      user_input: content.trim(),
      options: (chatMetadata.possiblePaths || []).map((p: any) => p.text)
    });
    context.chatHistory = chatHistory;

    // 6. Initialize pipeline trace
    const initialTrace: CognitiveTrace = {
      state: activeChat.state || 'Listening',
      emotions: [],
      reflections: [],
      readinessScore: 0.0,
      readinessThreshold: 0.65,
      mascotCharacter: chatMetadata.lastMascot || 'munch',
      mascotExpression: 'idle',
      mascotReason: '',
      generatedPaths: chatMetadata.possiblePaths || [],
      confidence: 1.0,
      activeTopicKey
    };

    // 7. Run Modular Engines Plugin Pipeline
    const pipeline = [
      new NluEnginePlugin(),
      new EmotionEnginePlugin(),
      new EmotionalStateEngine(),
      new EmotionRegulationEngine(),
      new EmotionDynamicsEngine(),
      new ReflectionEngine(),
      new MascotSpecialistEngine(),
      new DecisionReadinessEngine()
    ];

    const finalTrace = await runCognitivePipeline(pipeline, initialTrace, context);

    // 8. Call Gemini Voice Narrator
    const voiceMessageText = await generateMascotVoice(finalTrace, context);

    // 9. Save Mascot message to Database
    const { data: mascotMessage } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: activeChat.id,
        sender: 'mascot',
        content: voiceMessageText,
        mascot_character: finalTrace.mascotCharacter,
        mascot_expression: finalTrace.mascotExpression,
        nlu_metadata: {
          emotions: finalTrace.emotions,
          readinessScore: finalTrace.readinessScore,
          readinessThreshold: finalTrace.readinessThreshold,
          reflections: finalTrace.reflections
        }
      })
      .select()
      .single();

    // 10. Update active chat in database
    chatMetadata.activeTopicKey = activeTopicKey;
    chatMetadata.possiblePaths = finalTrace.generatedPaths;
    chatMetadata.lastMascot = finalTrace.mascotCharacter;
    chatMetadata.branches = branches;

    await supabase
      .from('chats')
      .update({
        state: finalTrace.state,
        metadata: chatMetadata
      })
      .eq('id', activeChat.id);

    // 11. Periodic summary execution in background
    const messageCount = (recentMessages || []).length;
    if (messageCount >= 20 && messageCount % 20 === 0) {
      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      generateConversationSummary(activeChat.id, user.id, allMessages || [])
        .catch(err => console.error('[Summarizer] Background summary failed:', err));
    }

    return NextResponse.json({
      message: mascotMessage,
      userMessage,
      state: finalTrace.state,
      mascotCharacter: finalTrace.mascotCharacter,
      mascotExpression: finalTrace.mascotExpression,
      readinessScore: finalTrace.readinessScore,
      readinessThreshold: finalTrace.readinessThreshold,
      reflections: finalTrace.reflections,
      possiblePaths: finalTrace.generatedPaths
    });
  } catch (error: any) {
    console.error('POST /api/chat failed with error:', error);
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 });
  }
}
