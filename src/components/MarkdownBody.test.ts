import { describe, expect, it } from 'vitest'
import { isExternalHttpLink } from './MarkdownBody'

describe('isExternalHttpLink', () => {
  it('accepts absolute http(s) URLs (kept as real anchors)', () => {
    expect(isExternalHttpLink('https://example.com')).toBe(true)
    expect(isExternalHttpLink('http://example.com/path?q=1')).toBe(true)
    expect(isExternalHttpLink('HTTPS://EXAMPLE.COM')).toBe(true)
  })

  it('rejects the repo-relative .md links that 404 in the SPA (#22)', () => {
    expect(isExternalHttpLink('01-how-llms-work.md')).toBe(false)
    expect(isExternalHttpLink('./section.md')).toBe(false)
    expect(isExternalHttpLink('../up.md')).toBe(false)
    expect(isExternalHttpLink('/academy-web/01-how-llms-work.md')).toBe(false)
  })

  it('rejects anchors, non-http schemes, and empty hrefs', () => {
    expect(isExternalHttpLink('#heading')).toBe(false)
    expect(isExternalHttpLink('mailto:x@y.com')).toBe(false)
    expect(isExternalHttpLink('')).toBe(false)
    expect(isExternalHttpLink(undefined)).toBe(false)
  })
})
