import { createClient } from '@/utils/supabase/server';
import { HUPSObservation, HUPSDimension } from './types';

// Add observation to the database
export async function addObservation(observation: HUPSObservation) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_observations')
    .insert({
      user_id: observation.user_id,
      source_type: observation.source_type,
      source_id: observation.source_id,
      dimension: observation.dimension,
      key: observation.key,
      observed_value: observation.observed_value,
      confidence: observation.confidence,
      context: observation.context || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting observation:', error);
    throw error;
  }

  // Recalculate belief for this user, dimension and key
  await recalculateBelief(observation.user_id, observation.dimension, observation.key);
  return data;
}

// Recalculates and upserts a belief based on all gathered observations for a key
export async function recalculateBelief(userId: string, dimension: HUPSDimension, key: string) {
  const supabase = await createClient();
  
  // Fetch all observations for this key
  const { data: observations, error } = await supabase
    .from('user_observations')
    .select('id, observed_value, confidence, created_at, source_type')
    .eq('user_id', userId)
    .eq('dimension', dimension)
    .eq('key', key);

  if (error) {
    console.error('Error fetching observations for recalculation:', error);
    return;
  }

  if (!observations || observations.length === 0) {
    // If no observations remain, delete the belief
    await supabase
      .from('user_beliefs')
      .delete()
      .eq('user_id', userId)
      .eq('dimension', dimension)
      .eq('key', key);
    return;
  }

  const now = new Date();
  let totalWeight = 0;
  let weightedConfidenceSum = 0;
  
  // Track unique values and their total weights to determine the consensus value
  const valueWeightMap = new Map<string, { rawVal: any; weight: number }>();

  const LAMBDA = 0.05; // Time decay constant (~5% decay per day)
  const GAMMA = 0.5;   // Scale factor to slow down single-incident learning (requires multiple observations to reach high confidence)

  observations.forEach((obs) => {
    const ageInMs = now.getTime() - new Date(obs.created_at).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-LAMBDA * ageInDays);

    totalWeight += weight;
    weightedConfidenceSum += obs.confidence * weight;

    // Stringify value for key matching in Map
    const valStr = JSON.stringify(obs.observed_value);
    const existing = valueWeightMap.get(valStr) || { rawVal: obs.observed_value, weight: 0 };
    valueWeightMap.set(valStr, { rawVal: obs.observed_value, weight: existing.weight + weight });
  });

  if (totalWeight <= 0) {
    return;
  }

  // 1. Determine Consensus Value (highest weighted value)
  let consensusValue = null;
  let maxValWeight = -1;
  valueWeightMap.forEach((entry) => {
    if (entry.weight > maxValWeight) {
      maxValWeight = entry.weight;
      consensusValue = entry.rawVal;
    }
  });

  // 2. Calculate Probabilistic Confidence
  const averageObsConfidence = weightedConfidenceSum / totalWeight;
  const evidenceScale = 1 - Math.exp(-GAMMA * totalWeight);
  const finalConfidence = Math.max(0.0, Math.min(1.0, averageObsConfidence * evidenceScale));

  // 3. Build Evidence References JSON
  const evidenceRefs = observations.map(obs => ({
    observation_id: obs.id,
    source_type: obs.source_type,
    timestamp: obs.created_at
  }));

  // 4. Upsert belief
  const { error: upsertError } = await supabase
    .from('user_beliefs')
    .upsert({
      user_id: userId,
      dimension,
      key,
      value: consensusValue,
      confidence: finalConfidence,
      evidence_count: observations.length,
      evidence_refs: evidenceRefs,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,dimension,key'
    });

  if (upsertError) {
    console.error('Error upserting belief:', upsertError);
  }
}

// Retrieves profile object with all beliefs formatted
export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data: beliefs, error } = await supabase
    .from('user_beliefs')
    .select('id, dimension, key, value, confidence, evidence_count, evidence_refs')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching profile beliefs:', error);
    throw error;
  }
  
  return beliefs || [];
}
