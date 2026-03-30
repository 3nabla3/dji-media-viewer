// lib/dji-xp-comment.ts

export interface DjiFlightData {
  Type?: string
  AbsoluteAltitude?: string
  RelativeAltitude?: string
  GimbalRollDegree?: string
  GimbalYawDegree?: string
  GimbalPitchDegree?: string
  FlightRollDegree?: string
  FlightYawDegree?: string
  FlightPitchDegree?: string
  FlightXSpeed?: string
  FlightYSpeed?: string
  FlightZSpeed?: string
  CamReverse?: string
  GimbalReverse?: string
}

/**
 * Parses a DJI XPComment string of the form "Key=Value;Key2=Value2;..."
 * into a typed object. Unknown keys are ignored.
 */
export function parseXpComment(raw: string | undefined): DjiFlightData {
  if (!raw) return {}
  const result: Record<string, string> = {}
  for (const pair of raw.split(';')) {
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    const key = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (key) result[key] = value
  }
  return result as DjiFlightData
}
