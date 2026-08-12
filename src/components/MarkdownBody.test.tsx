// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownBody, { isExternalHttpLink } from './MarkdownBody'

// jsdom has no real layout engine, so SVGElement text-measurement APIs that
// mermaid's flowchart layout relies on don't exist — stub them so the
// mermaid-composition check below (PROJ-011/T-207) can actually render.
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
})
Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
  writable: true,
  value: () => 60,
})

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

describe('MarkdownBody callouts (PROJ-011/T-207)', () => {
  it('renders a labelled blockquote (`> **Note:** ...`) as a callout card, not a plain blockquote', () => {
    const { container } = render(
      <MarkdownBody>{'> **Note:** this is a callout body.'}</MarkdownBody>,
    )
    expect(container.querySelector('blockquote')).toBeNull()
    const title = container.querySelector('[data-slot="card-title"]')
    expect(title?.textContent).toBe('Note')
    expect(container.textContent).toContain('this is a callout body.')
  })

  it('renders a labelled blockquote with multiple blocks, keeping the remaining blocks in the card', () => {
    const { container } = render(
      <MarkdownBody>{'> **Warning:** first line.\n>\n> Second paragraph.'}</MarkdownBody>,
    )
    expect(container.querySelector('blockquote')).toBeNull()
    expect(container.textContent).toContain('first line.')
    expect(container.textContent).toContain('Second paragraph.')
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('leaves an unlabelled blockquote as a plain blockquote (additive, not a behaviour change)', () => {
    const { container } = render(
      <MarkdownBody>{'> just a regular quote, no label here'}</MarkdownBody>,
    )
    const blockquote = container.querySelector('blockquote')
    expect(blockquote).toBeTruthy()
    expect(blockquote?.textContent).toContain('just a regular quote, no label here')
  })

  it('leaves a blockquote with bold-but-unlabelled text (no trailing colon) as a plain blockquote', () => {
    const { container } = render(
      <MarkdownBody>{'> **Not a label** just emphasis at the start'}</MarkdownBody>,
    )
    expect(container.querySelector('blockquote')).toBeTruthy()
  })
})

// PROJ-011/T-207: the new blockquote callout override must compose with the
// existing mermaid-fence routing (code/pre overrides), not replace it.
describe('Mermaid diagrams still render after the callout override (composition check)', () => {
  it('renders a ```mermaid fence to an SVG, not an error box, alongside a callout in the same doc', async () => {
    const markdown = [
      '> **Note:** a callout above a diagram.',
      '',
      '```mermaid',
      'flowchart TD',
      '    A["Start"] --> B{"Decision?"}',
      '    B -->|"Yes"| C["Do it"]',
      '```',
    ].join('\n')

    const { container } = render(<MarkdownBody>{markdown}</MarkdownBody>)

    await waitFor(() => {
      expect(container.querySelector('.mermaid-diagram svg')).toBeTruthy()
    })

    expect(container.querySelector('.text-destructive')).toBeNull()
    expect(container.querySelector('blockquote')).toBeNull()
    const title = container.querySelector('[data-slot="card-title"]')
    expect(title?.textContent).toBe('Note')
  })
})
