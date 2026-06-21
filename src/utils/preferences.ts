export type FeedbackRating = 'love' | 'okay' | 'meh'

/**
 * Returns the score delta for a given feedback rating.
 */
export function getScoreDelta(rating: FeedbackRating): number {
  switch (rating) {
    case 'love':
      return 2.0
    case 'okay':
      return 0.5
    case 'meh':
      return -1.0
    default:
      return 0.0
  }
}

/**
 * Calculates the new score, clamping it between -10.0 and 10.0.
 */
export function calculateNewScore(currentScore: number, rating: FeedbackRating): number {
  const delta = getScoreDelta(rating)
  const newScore = currentScore + delta
  return Math.max(-10.0, Math.min(10.0, newScore))
}
