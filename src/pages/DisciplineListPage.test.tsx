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
  it('deve carregar por padrao sem restringir curso, com ordenacao alfabetica e 20 itens por pagina', async () => {
    mockedGetComponents.mockImplementation(async ({ page = 0, limit = 20, sortBy = 'name', department }) => ({
      results: [
        {
          id: `component-${page}-${limit}`,
          code: 'IC045',
          name: 'Compiladores',
          department: 'Ciencia da Computacao',
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

    expect((await screen.findAllByText('Compiladores')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Curso')).toHaveValue('__all__');
    expect(screen.getByLabelText('Buscar por codigo ou nome')).toHaveFocus();
    expect(screen.getByLabelText('Itens por pagina')).toHaveValue('20');

    await waitFor(() => {
      expect(mockedGetComponents).toHaveBeenCalled();
    });

    expect(mockedGetComponents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 0,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'ASC',
        department: undefined,
      })
    );
  });

  it('deve permitir filtrar por curso do IC', async () => {
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

    await userEvent.selectOptions(screen.getByLabelText('Curso'), 'Bacharelado em Sistemas de Informa\u00e7\u00e3o');

    await waitFor(() => {
      expect(mockedGetComponents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          department: 'Bacharelado em Sistemas de Informa\u00e7\u00e3o',
        })
      );
    });
  });
});
