import { createClient } from '@/utils/supabase/server';
import { AgentObservation, ContextPackage } from '../orchestrator/types';
import { runNLUPipeline } from './pipeline';
import { NLUObservationsOutput, NLUHistoryItem } from './types';
import { resolveNLUObservations } from './resolver';
import { randomUUID } from 'crypto';

/**
 * The Layer 1 NLU Engine Service.
 * Understands what the user is trying to communicate, mapping natural language
 * context to structured understanding observations, executing safeguards, weighting,
 * and meaning evolution.
 */
export class NLUEngine {
  /**
   * Run full context-aware NLU analysis and return observations compatible with MunchOrchestrator.
   */
  public async analyze(context: ContextPackage): Promise<AgentObservation[]> {
    // 1. Fetch NLU History from Supabase for Meaning Evolution
    const history: NLUHistoryItem[] = [];
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('user_observations')
        .select('id, user_id, source_type, source_id, dimension, key, observed_value, confidence, context, created_at')
        .eq('user_id', context.user_id)
        .eq('dimension', 'nlu')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        history.push(...(data as any[]).map(item => ({
          id: item.id,
          user_id: item.user_id,
          source_type: item.source_type,
          source_id: item.source_id,
          dimension: item.dimension,
          key: item.key,
          observed_value: item.observed_value,
          confidence: Number(item.confidence),
          context: item.context || undefined,
          created_at: item.created_at
        })));
      }
    } catch (err) {
      console.warn('[NLUEngine] Failed to load NLU history from Supabase:', err);
    }

    // 2. Run core analysis pipeline
    const rawAnalysis: NLUObservationsOutput = await runNLUPipeline(context);

    // 3. Resolve observations through the NLU Resolver (weighting, hierarchy, stability, safeguards, curiosity)
    const analysis = resolveNLUObservations(rawAnalysis, context, history);

    const observations: AgentObservation[] = [];

    // Helper to calculate representative confidence
    const getRepresentativeConfidence = (items: Array<{ confidence: number }>, defaultVal = 1.0): number => {
      if (items.length === 0) return defaultVal;
      return Math.max(...items.map(i => i.confidence));
    };

    // 4. Map the resolved outputs to AgentObservations
    const mappings: Array<{ key: keyof NLUObservationsOutput; label: string }> = [
      { key: 'meanings', label: 'meaning interpretations' },
      { key: 'topics', label: 'active topics' },
      { key: 'entities', label: 'identified entities' },
      { key: 'ambiguities', label: 'detected ambiguities' },
      { key: 'assumptions', label: 'implicit assumptions' },
      { key: 'missing_info', label: 'information gaps' },
      { key: 'hidden_meanings', label: 'potential implicit meanings' },
      { key: 'communication_purposes', label: 'communication purposes' },
      { key: 'state_signals', label: 'user state signals' },
      { key: 'dynamics', label: 'conversation dynamics' },
      { key: 'curiosity_triggers', label: 'curiosity opportunities' },
      { key: 'decision_context', label: 'decision context observations' },
      
      // Cognitive Detections
      { key: 'perspectives', label: 'user perspectives' },
      { key: 'certainties', label: 'user certainties' },
      { key: 'goals', label: 'user goals' },
      { key: 'obstacles', label: 'user obstacles' },
      { key: 'stakeholders', label: 'decision stakeholders' },
      { key: 'importances', label: 'importance factors' },
      { key: 'relationship_references', label: 'relationship references' },
      { key: 'reflections', label: 'user self-reflections' },
      { key: 'readiness_signals', label: 'emotional readiness signals' }
    ];

    for (const map of mappings) {
      const items = analysis[map.key] as any[];
      if (items && items.length > 0) {
        const confidence = getRepresentativeConfidence(items);
        let reasoning = `Resolved ${items.length} ${map.label} from context.`;
        if (map.key === 'topics') {
          reasoning = `Identified active topics: ${items.map(t => t.topic).join(', ')}.`;
        } else if (map.key === 'state_signals') {
          reasoning = `Detected observable user state signals: ${items.map(s => s.signal).join(', ')}.`;
        } else if (map.key === 'decision_context') {
          const activeDecision = items.find(d => d.decision_present);
          reasoning = activeDecision
            ? `Decision context detected: ${activeDecision.decision_type || 'unclassified'} (Complexity: ${activeDecision.complexity || 'unknown'})`
            : 'No active decision context identified.';
        }

        observations.push({
          agent_name: 'NLU Agent',
          type: 'nlu',
          key: map.key,
          value: items,
          confidence,
          reasoning
        });
      }
    }

    // 5. Asynchronously log observations to database to preserve history for future runs
    this.logObservationsAsync(context.user_id, context.user_input, observations, context.decision_history?.[0]?.id)
      .catch(err => console.error('[NLUEngine] Asynchronous logging failed:', err));

    return observations;
  }

  /**
   * Log generated NLU observations back to user_observations for Meaning Stability & Evolution.
   */
  private async logObservationsAsync(
    userId: string,
    userInput: string,
    observations: AgentObservation[],
    latestDecisionId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      const sourceId = latestDecisionId || randomUUID();
      const payload = observations.map(obs => ({
        user_id: userId,
        source_type: 'interaction',
        source_id: sourceId,
        dimension: 'nlu',
        key: obs.key,
        observed_value: obs.value,
        confidence: obs.confidence,
        context: `NLU Engine analysis of user input: "${userInput.slice(0, 100)}"`
      }));

      if (payload.length > 0) {
        const { error } = await supabase
          .from('user_observations')
          .insert(payload);
        if (error) {
          console.warn('[NLUEngine] Database insert warning during logging:', error);
        }
      }
    } catch (err) {
      console.warn('[NLUEngine] Database log error:', err);
    }
  }
}

export const nluEngine = new NLUEngine();
