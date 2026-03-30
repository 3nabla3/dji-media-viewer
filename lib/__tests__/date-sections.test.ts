// lib/__tests__/date-sections.test.ts
import { describe, it, expect } from 'vitest'
import { groupByDate } from '../date-sections'
import type { MediaItem } from '../media-types'

// Fixed reference point: Thursday 2024-06-13 10:00 local time
// ISO week 24 of 2024 spans Mon 2024-06-10 → Sun 2024-06-16
const NOW = new Date('2024-06-13T10:00:00')

function makeItem(date: Date, idx = 0): { item: MediaItem; idx: number } {
  const file = new File([], 'test.jpg')
  return { item: { type: 'photo', file, date }, idx }
}

describe('groupByDate', () => {
  it('places an item from today into Today', () => {
    const entry = makeItem(new Date('2024-06-13T08:30:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Today')
    expect(sections[0].items[0]).toBe(entry)
  })

  it('places an item from earlier this week (not today) into This Week', () => {
    const entry = makeItem(new Date('2024-06-10T09:00:00')) // Monday, same ISO week
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Week')
  })

  it('places an item from earlier this month (different week) into This Month', () => {
    const entry = makeItem(new Date('2024-06-03T12:00:00')) // week 23, same month
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Month')
  })

  it('places an item from earlier this year (different month) into This Year', () => {
    const entry = makeItem(new Date('2024-03-15T10:00:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Year')
  })

  it('places an item from a previous year into Others', () => {
    const entry = makeItem(new Date('2023-12-25T10:00:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Others')
  })

  it('omits empty sections', () => {
    const entry = makeItem(new Date('2024-06-13T08:00:00')) // Today only
    const sections = groupByDate([entry], NOW)
    const labels = sections.map((s) => s.label)
    expect(labels).toEqual(['Today'])
    expect(labels).not.toContain('This Week')
    expect(labels).not.toContain('Others')
  })

  it('sorts items within a section descending by date', () => {
    const older = makeItem(new Date('2024-06-13T07:00:00'), 0)
    const newer = makeItem(new Date('2024-06-13T09:00:00'), 1)
    const sections = groupByDate([older, newer], NOW)
    expect(sections[0].label).toBe('Today')
    expect(sections[0].items[0]).toBe(newer) // newer first
    expect(sections[0].items[1]).toBe(older)
  })

  it('returns sections in order: Today → This Week → This Month → This Year → Others', () => {
    const entries = [
      makeItem(new Date('2023-01-01T00:00:00'), 0), // Others
      makeItem(new Date('2024-03-01T00:00:00'), 1), // This Year
      makeItem(new Date('2024-06-13T08:00:00'), 2), // Today
      makeItem(new Date('2024-06-03T00:00:00'), 3), // This Month
      makeItem(new Date('2024-06-10T00:00:00'), 4), // This Week
    ]
    const sections = groupByDate(entries, NOW)
    expect(sections.map((s) => s.label)).toEqual([
      'Today', 'This Week', 'This Month', 'This Year', 'Others',
    ])
  })

  it('ISO week boundary: Sunday before now\'s week → This Month (not This Week)', () => {
    // now = 2024-06-13 (week 24). Sunday 2024-06-09 is end of week 23.
    const entry = makeItem(new Date('2024-06-09T23:59:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections[0].label).toBe('This Month') // same month, different week
  })

  it('returns empty array when given no items', () => {
    expect(groupByDate([], NOW)).toEqual([])
  })

  it('places an item from the Monday starting now\'s week into This Week', () => {
    // now = Thursday 2024-06-13 (week 24). Monday 2024-06-10 is the first day of week 24.
    const entry = makeItem(new Date('2024-06-10T00:01:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections[0].label).toBe('This Week')
  })
})
