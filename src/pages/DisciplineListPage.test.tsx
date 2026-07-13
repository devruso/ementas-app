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

describe('DisciplineListPage public filters', () => {
  it('deve carregar por padrão com DCC, ordenação alfabética e 20 itens por página', async () => {
    mockedGetComponents.mockImplementation(async ({ page = 0, limit = 20, sortBy = 'name', department }) => ({
      results: [
        {
          id: `component-${page}-${limit}`,
          code: 'IC045',
          name: 'Compiladores',
          department: 'Ciência da Computação',
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
        sortBy,
        department,
      },
    }));

    render(
      <MemoryRouter>
        <DisciplineListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Compiladores')).toBeInTheDocument();
    expect(screen.getByLabelText('Departamento')).toHaveValue('__dcc__');
    expect(screen.getByLabelText('Itens por página')).toHaveValue('20');

    await waitFor(() => {
      expect(mockedGetComponents).toHaveBeenCalled();
    });

    expect(mockedGetComponents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 0,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'ASC',
        department: '__dcc__',
      })
    );

    expect(screen.queryByText('1 resultado(s)')).not.toBeInTheDocument();
  });

  it('deve permitir alternar para Computação Interdisciplinar', async () => {
    mockedGetComponents.mockResolvedValue({
      results: [],
      total: 0,
      meta: {
        page: 0,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <DisciplineListPage />
      </MemoryRouter>
    );

    await userEvent.selectOptions(screen.getByLabelText('Departamento'), '__dci__');

    await waitFor(() => {
      expect(mockedGetComponents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          department: '__dci__',
        })
      );
    });
  });
});
