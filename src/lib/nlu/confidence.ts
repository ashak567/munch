/**
 * Normalizes confidence scores to be strictly between 0.0 and 1.0.
 */
export function normalizeConfidence(score: number | undefined | null, fallback = 0.5): number {
  if (score === undefined || score === null || isNaN(score)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, score));
}

/**
 * Validates whether an observation's confidence meets a minimum threshold.
 */
export function meetsThreshold(confidence: number, threshold = 0.3): boolean {
  return confidence >= threshold;
}

/**
 * Helper to construct an evidence context summary string.
 */
export function buildEvidenceContext(source: string, snippet?: string): string {
  if (!snippet) {
    return `Derived from: ${source}`;
  }
  return `Derived from: ${source} ("${snippet}")`;
}
