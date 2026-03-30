import { describe, it, expect } from 'vitest'
import { parseXpComment } from '../dji-xp-comment'

describe('parseXpComment', () => {
  it('returns empty object for undefined input', () => {
    expect(parseXpComment(undefined)).toEqual({})
  })

  it('returns empty object for empty string', () => {
    expect(parseXpComment('')).toEqual({})
  })

  it('parses a full DJI XPComment string', () => {
    const raw =
      'Type=P;AbsoluteAltitude=+0120.25;RelativeAltitude=+0095.10;' +
      'GimbalRollDegree=+0.00;GimbalYawDegree=+0012.40;GimbalPitchDegree=-0090.00;' +
      'FlightRollDegree=+0.00;FlightYawDegree=+0014.20;FlightPitchDegree=+0.00;' +
      'FlightXSpeed=+0.0;FlightYSpeed=+0.0;FlightZSpeed=+0.0;CamReverse=0;GimbalReverse=0'

    const result = parseXpComment(raw)
    expect(result.AbsoluteAltitude).toBe('+0120.25')
    expect(result.RelativeAltitude).toBe('+0095.10')
    expect(result.GimbalPitchDegree).toBe('-0090.00')
    expect(result.GimbalYawDegree).toBe('+0012.40')
    expect(result.FlightYawDegree).toBe('+0014.20')
    expect(result.Type).toBe('P')
  })

  it('ignores malformed pairs', () => {
    const result = parseXpComment('Good=Value;BadEntry;=NoKey')
    expect(result.Good).toBe('Value')
    expect(Object.keys(result)).toHaveLength(1)
  })
})
