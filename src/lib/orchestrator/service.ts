import { createClient } from '@/utils/supabase/server';
import { getProfile } from '../hup/service';
import { retrieveMemories } from '../memory/service';
import {
  Agent,
  AgentObservation,
  ContextPackage,
  ReasoningPackage,
  ConflictRecord
} from './types';
import {
  NLUAgent,
  EmotionAgent,
  IntentAgent,
  RelationshipAgent,
  MascotAgent,
  runSharedPipeline
} from './agents';

export function resolveConflicts(observations: AgentObservation[]): {
  conflicts: ConflictRecord[];
  uncertainties: string[];
} {
  const conflicts: ConflictRecord[] = [];
  const uncertainties: string[] = [];

  // Group observations by key
  const groupedByKey = new Map<string, AgentObservation[]>();
  for (const obs of observations) {
    const list = groupedByKey.get(obs.key) || [];
    list.push(obs);
    groupedByKey.set(obs.key, list);
  }

  for (const [key, obsList] of groupedByKey.entries()) {
    if (obsList.length <= 1) continue;

    // Check if there are different values
    const uniqueValues = new Set<string>();
    const uniqueObs: AgentObservation[] = [];

    for (const obs of obsList) {
      const valStr = JSON.stringify(obs.value);
      if (!uniqueValues.has(valStr)) {
        uniqueValues.add(valStr);
        uniqueObs.push(obs);
      }
    }

    if (uniqueObs.length > 1) {
      // Conflict detected!
      // Compute uncertainty level as the average confidence of the competing observations
      const sumConf = uniqueObs.reduce((acc, o) => acc + o.confidence, 0);
      const avgConf = sumConf / uniqueObs.length;

      conflicts.push({
        key,
        competing_observations: obsList,
        uncertainty_level: Number(avgConf.toFixed(2))
      });

      uncertainties.push(
        `Conflict on key '${key}': competing hypotheses between ${obsList.map(
          o => `'${o.value}' (from ${o.agent_name}, confidence ${o.confidence})`
        ).join(' and ')}`
      );
    }
  }

  return { conflicts, uncertainties };
}

export class MunchOrchestrator {
  private agents: Agent[] = [];

  constructor() {
    // Register default virtual agents
    this.registerAgent(new NLUAgent());
    this.registerAgent(new EmotionAgent());
    this.registerAgent(new IntentAgent());
    this.registerAgent(new RelationshipAgent());
    this.registerAgent(new MascotAgent());
  }

  public registerAgent(agent: Agent) {
    this.agents.push(agent);
  }

  public getAgents(): Agent[] {
    return this.agents;
  }

  public async orchestrate(params: {
    user_id: string;
    user_input: string;
    options: string[];
    importance?: string;
    emotional_state?: string;
    current_context?: string;
  }): Promise<ReasoningPackage> {
    // 1. Retrieve profile beliefs
    const profile_beliefs = await getProfile(params.user_id).catch(err => {
      console.error('Orchestrator HUPS fetch failed:', err);
      return [];
    }) as any;

    // 2. Retrieve relevant memories
    const relevant_memories = await retrieveMemories(params.user_id, params.user_input, 5).catch(err => {
      console.error('Orchestrator memory retrieval failed:', err);
      return [];
    });

    // 3. Fetch recent decisions for decision history context
    const supabase = await createClient();
    const { data: recentDecisions } = await supabase
      .from('decisions')
      .select('id, selected_option, category, mascot, created_at')
      .eq('user_id', params.user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // 4. Assemble context package
    const context: ContextPackage = {
      user_id: params.user_id,
      user_input: params.user_input,
      options: params.options,
      importance: params.importance,
      emotional_state: params.emotional_state,
      current_context: params.current_context,
      profile_beliefs,
      relevant_memories,
      decision_history: recentDecisions || []
    };

    // 5. Execute agents (shared pipeline + independent agents)
    const sharedPipelineAgents = this.agents.filter(
      a => (a as any).isSharedPipeline === true
    );
    const independentAgents = this.agents.filter(
      a => (a as any).isSharedPipeline !== true
    );

    const observations: AgentObservation[] = [];

    // Run shared pipeline for virtual agents
    if (sharedPipelineAgents.length > 0) {
      try {
        const sharedObs = await runSharedPipeline(context, sharedPipelineAgents);
        observations.push(...sharedObs);
      } catch (err) {
        console.error('Shared pipeline error in orchestrator:', err);
      }
    }

    // Run custom independent agents concurrently
    if (independentAgents.length > 0) {
      const independentPromises = independentAgents.map(async agent => {
        try {
          const obs = await agent.analyze(context);
          return obs;
        } catch (err) {
          console.error(`Independent agent ${agent.name} failed:`, err);
          return [];
        }
      });
      const results = await Promise.all(independentPromises);
      for (const res of results) {
        observations.push(...res);
      }
    }

    // 6. Resolve conflicts
    const { conflicts, uncertainties } = resolveConflicts(observations);

    // 7. Return reasoning package
    return {
      context,
      observations,
      conflicts,
      uncertainties
    };
  }
}
