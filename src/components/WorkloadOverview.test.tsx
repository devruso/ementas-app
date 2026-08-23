import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WorkloadOverview } from './WorkloadOverview';

describe('WorkloadOverview', () => {
  it('deve apresentar os três grupos e todos os valores sem permitir edição', () => {
    render(
      <WorkloadOverview
        workload={{
          studentTheory: 30,
          studentPractice: 15,
          teacherTheory: 20,
          modulePracticeInternship: 10,
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Carga horária Estudante' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carga horária Professor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carga horária Módulo' })).toBeInTheDocument();
    expect(screen.getByText('30h')).toBeInTheDocument();
    expect(screen.getByText('15h')).toBeInTheDocument();
    expect(screen.getByText('20h')).toBeInTheDocument();
    expect(screen.getByText('10h')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Carga horária' })).queryByRole('textbox')).not.toBeInTheDocument();
  });
});
