// Maps an interpreted commitment proposal to the manual form values. Pure: no React Native imports.
import { displayBrazilianDate } from './commitmentDate.ts';
import type { CommitmentProposal, ProposalKind } from './proposalParsing.ts';

export type ProposalFormValues = {
  title: string;
  kind: ProposalKind;
  description: string;
  subjectId: string | null;
  /** DD/MM/AAAA, or '' when the proposal has no due date. */
  date: string;
  /** HH:MM, or '' when the proposal has no time (date precision). */
  time: string;
};

/**
 * `sourceText` is the original text the user spoke or typed. It is kept in the description
 * when the candidate does not provide one, so nothing the user said is lost in review.
 */
export function proposalToFormValues(proposal: CommitmentProposal, sourceText = ''): ProposalFormValues {
  const candidate = proposal.candidate;
  if (!candidate) {
    return { title: '', kind: 'reminder', description: sourceText, subjectId: null, date: '', time: '' };
  }
  const due = candidate.due;
  const description = candidate.description?.trim() ? candidate.description : sourceText;
  return {
    title: candidate.title,
    kind: candidate.kind,
    description,
    subjectId: candidate.subjectId,
    date: due ? displayBrazilianDate(due.localDate) : '',
    time: due?.precision === 'dateTime' ? due.localTime.slice(0, 5) : '',
  };
}
