export const publicationFieldIds: Record<string, string> = {
  Curso: 'department', Ementa: 'syllabus', Objetivos: 'objective',
  'Conteúdo programático': 'program', Metodologia: 'methodology',
  'Avaliação da aprendizagem': 'learningAssessment',
};

export const focusDisciplineField = (field: string) => {
  const element = document.getElementById(`discipline-${field}`);
  element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  element?.focus({ preventScroll: true });
};
