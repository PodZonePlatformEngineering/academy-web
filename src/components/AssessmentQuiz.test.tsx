// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AssessmentQuestion } from '@/lib/assessment'

const OPTION_TEXT = 'Which of these is correct?\n\nA) First option\nB) Second option\nC) Third option\nD) Fourth option'

const QUESTION: AssessmentQuestion = {
  id: 'q1',
  type: 'assessment',
  module_id: 'VC1',
  section_id: null,
  assessment_id: 'VC1-assessment',
  ordinal: 4,
  title: 'Question 1',
  text: OPTION_TEXT,
}

vi.mock('@/lib/assessment', () => ({
  AssessmentDenied: class AssessmentDenied extends Error {},
  fetchAssessmentQuestions: () => Promise.resolve([QUESTION]),
  startAssessmentClaim: vi.fn(),
  submitAssessment: vi.fn(),
}))

vi.mock('@/lib/api', () => ({ demoMode: true }))

import AssessmentQuiz from '@/components/AssessmentQuiz'

describe('AssessmentQuiz option rendering (ACP-419)', () => {
  it('keeps each A)/B)/C)/D) option on its own line, not collapsed into one paragraph', async () => {
    const { container } = render(
      <AssessmentQuiz
        curriculumSlug="vibecoding"
        moduleId="VC1"
        assessmentId="VC1-assessment"
        enrolmentId={null}
      />,
    )

    await waitFor(() => expect(screen.queryByText(/First option/)).not.toBeNull())

    const optionsParagraph = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('First option'),
    )
    expect(optionsParagraph).toBeDefined()
    // The literal newlines react-markdown preserves in the DOM text node
    // only render as real line breaks if `white-space` honours them —
    // confirm the scoped class is actually present on (or inherited by) the
    // rendered paragraph, not just that the text is technically all there.
    expect(optionsParagraph?.closest('.\\[\\&_p\\]\\:whitespace-pre-line')).not.toBeNull()
    expect(optionsParagraph?.textContent).toContain('A) First option')
    expect(optionsParagraph?.textContent).toContain('D) Fourth option')
  })
})
