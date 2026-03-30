// lib/__tests__/hdr-detector.test.ts
import { describe, it, expect } from 'vitest'
import { groupIntoBrackets } from '../hdr-detector'
import type { JpgWithExif } from '../hdr-detector'
import type { PhotoItem, HdrItem } from '../media-types'

function makeJpg(
  name: string,
  isoDate: string,
  bias: number | undefined,
  xpType?: string
): JpgWithExif {
  const file = Object.assign(new File([], name), { webkitRelativePath: `root/${name}` })
  return {
    file,
    dateTimeOriginal: new Date(isoDate),
    exposureBiasValue: bias,
    xpCommentType: xpType,
  }
}

describe('groupIntoBrackets', () => {
  it('returns a standalone photo when DateTimeOriginal is unique', () => {
    const items = [makeJpg('DJI_0001.JPG', '2024-01-01T10:00:00Z', 0)]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('photo')
  })

  it('groups 3 files with same timestamp into an HDR item', () => {
    const ts = '2024-01-01T10:00:01Z'
    const items = [
      makeJpg('DJI_0010.JPG', ts, -0.333),
      makeJpg('DJI_0011.JPG', ts, 0.333),
      makeJpg('DJI_0012.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    const hdr = result[0] as HdrItem
    // files sorted ascending by ExposureBiasValue
    expect(hdr.files[0]).toBe(items[0].file) // -0.333 (under)
    expect(hdr.files[2]).toBe(items[2].file) // +1.0 (over)
  })

  it('picks middle exposure as the median of the EV-sorted array', () => {
    const ts = '2024-01-01T10:00:02Z'
    const items = [
      makeJpg('DJI_0013.JPG', ts, -0.333),
      makeJpg('DJI_0014.JPG', ts, 0.333),
      makeJpg('DJI_0015.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    const hdr = result[0] as HdrItem
    // sorted ascending: [-0.333, +0.333, +1.0] → median is index 1 (+0.333)
    expect(hdr.middle).toBe(items[1].file) // DJI_0014 at +0.333
  })

  it('handles 1-second boundary: merges consecutive files straddling a second', () => {
    const items = [
      makeJpg('DJI_0020.JPG', '2024-01-01T10:00:59Z', -0.333),
      makeJpg('DJI_0021.JPG', '2024-01-01T10:01:00Z', 0.333),
      makeJpg('DJI_0022.JPG', '2024-01-01T10:01:00Z', 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    expect((result[0] as HdrItem).files).toHaveLength(3)
  })

  it('excludes files with XPComment Type=P (panorama tiles)', () => {
    const items = [
      makeJpg('DJI_0001.JPG', '2024-01-01T10:00:00Z', 0, 'P'),
      makeJpg('DJI_0002.JPG', '2024-01-01T10:00:00Z', 0, 'P'),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(0)
  })

  it('returns mixed photos and HDR sets when timestamps vary', () => {
    const hdrTs = '2024-01-01T10:00:00Z'
    const items = [
      makeJpg('DJI_0001.JPG', '2024-01-01T09:00:00Z', 0),   // standalone
      makeJpg('DJI_0010.JPG', hdrTs, -0.333),                // HDR
      makeJpg('DJI_0011.JPG', hdrTs, 0.333),                 // HDR
      makeJpg('DJI_0012.JPG', hdrTs, 1.0),                   // HDR
      makeJpg('DJI_0020.JPG', '2024-01-01T11:00:00Z', 0),   // standalone
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('photo')
    expect(result[1].type).toBe('hdr')
    expect(result[2].type).toBe('photo')
  })

  it('groups 2 files with same timestamp as HDR (not all brackets required)', () => {
    const ts = '2024-01-01T10:00:03Z'
    const items = [
      makeJpg('DJI_0030.JPG', ts, -0.333),
      makeJpg('DJI_0031.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    expect((result[0] as HdrItem).files).toHaveLength(2)
  })
})
