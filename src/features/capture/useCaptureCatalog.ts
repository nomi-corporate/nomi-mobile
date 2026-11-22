import { useCallback, useEffect, useState } from 'react';
import { useAcademic } from '@/features/academic/AcademicProvider';
import type { Professor } from '@/features/academic/domain/academic';
import type { AcademicSubject } from '@/features/academic/infrastructure/AcademicClient';

export type CaptureCatalogState = {
  status: 'loading' | 'ready' | 'error';
  subjects: AcademicSubject[];
  professors: Professor[];
  message: string | null;
  reload(): void;
};

/** Subjects and professors used by the capture forms (first page, up to 100 each). */
export function useCaptureCatalog(): CaptureCatalogState {
  const academic = useAcademic();
  const [state, setState] = useState<Omit<CaptureCatalogState, 'reload'>>({ status: 'loading', subjects: [], professors: [], message: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: 'loading', message: null }));
    Promise.all([academic.listSubjects({ limit: 100 }), academic.listProfessors({ limit: 100 })])
      .then(([subjects, professors]) => {
        if (active) setState({ status: 'ready', subjects: subjects.items, professors: professors.items, message: null });
      })
      .catch((cause: unknown) => {
        if (active) setState((current) => ({
          ...current,
          status: 'error',
          message: cause instanceof Error ? cause.message : 'Não foi possível carregar matérias e professores.',
        }));
      });
    return () => { active = false; };
  }, [academic, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, reload };
}

/** Subject and professor names for a draft; the professor falls back to the subject's first professor. */
export function resolveCommitmentNames(
  draft: { subjectId: string | null; professorId: string | null },
  catalog: Pick<CaptureCatalogState, 'subjects' | 'professors'>,
): { subjectName: string | null; professorName: string | null } {
  const subject = draft.subjectId ? catalog.subjects.find((item) => item.id === draft.subjectId) ?? null : null;
  const professorId = draft.professorId ?? subject?.professorIds[0] ?? null;
  const professor = professorId ? catalog.professors.find((item) => item.id === professorId) ?? null : null;
  return { subjectName: subject?.name ?? null, professorName: professor?.name ?? null };
}
