import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { getComponents } from '../lib/api';
import { DisciplineListPage } from './DisciplineListPage';

vi.mock('../lib/api', () => ({
  getComponents: vi.fn(),
}));

const mockedGetComponents = vi.mocked(getComponents);

describe('DisciplineListPage hybrid department mode', () => {
  it('deve sinalizar quando o modo híbrido por departamento estiver ativo', async () => {
    mockedGetComponents.mockImplementation(async ({ page = 0, limit = 12 }) => ({
      results: [
        {
          id: `component-${page}-${limit}`,
          code: 'IC045',
          name: 'Compiladores',
          department: 'PGCOMP',
          academicLevel: 'mestrado',
          syllabus: 'Ementa de teste',
          userId: 'u-1',
        },
      ],
      total: 1,
      meta: {
        page,
        limit,
        total: 1,
        totalPages: 1,
      },
    }));

    render(
      <MemoryRouter>
        <DisciplineListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Compiladores')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Departamento'), 'PGCOMP');

    await waitFor(() => {
      expect(screen.getByText(/Modo híbrido ativo:/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/paginação local na página 1 sobre dataset global filtrado/i)).toBeInTheDocument();
  });
});
