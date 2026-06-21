import { describe, it, expect } from 'vitest'
import { calculateNewScore, getScoreDelta } from './preferences'

describe('Preference Scoring & Clamping Tests', () => {
  describe('getScoreDelta', () => {
    it('should map ratings to correct delta scores', () => {
      expect(getScoreDelta('love')).toBe(2.0)
      expect(getScoreDelta('okay')).toBe(0.5)
      expect(getScoreDelta('meh')).toBe(-1.0)
      // @ts-expect-error - testing invalid rating fallback
      expect(getScoreDelta('invalid')).toBe(0.0)
    })
  })

  describe('calculateNewScore', () => {
    it('should correctly increment score for rating: love', () => {
      expect(calculateNewScore(0.0, 'love')).toBe(2.0)
      expect(calculateNewScore(5.0, 'love')).toBe(7.0)
    })

    it('should correctly increment score for rating: okay', () => {
      expect(calculateNewScore(0.0, 'okay')).toBe(0.5)
      expect(calculateNewScore(-2.5, 'okay')).toBe(-2.0)
    })

    it('should correctly decrement score for rating: meh', () => {
      expect(calculateNewScore(0.0, 'meh')).toBe(-1.0)
      expect(calculateNewScore(5.5, 'meh')).toBe(4.5)
    })

    it('should clamp scores to the upper boundary of 10.0', () => {
      expect(calculateNewScore(9.5, 'love')).toBe(10.0)
      expect(calculateNewScore(10.0, 'love')).toBe(10.0)
      expect(calculateNewScore(11.0, 'love')).toBe(10.0)
    })

    it('should clamp scores to the lower boundary of -10.0', () => {
      expect(calculateNewScore(-9.5, 'meh')).toBe(-10.0)
      expect(calculateNewScore(-10.0, 'meh')).toBe(-10.0)
      expect(calculateNewScore(-11.0, 'meh')).toBe(-10.0)
    })
  })
})
