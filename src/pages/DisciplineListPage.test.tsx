import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getComponentMetadata, getComponents } from '../lib/api';
import { DisciplineListPage } from './DisciplineListPage';

vi.mock('../lib/api', () => ({
  getComponentMetadata: vi.fn(),
  getComponents: vi.fn(),
}));

const mockedGetComponents = vi.mocked(getComponents);
const mockedGetComponentMetadata = vi.mocked(getComponentMetadata);

const componentMetadata = {
  defaults: { modality: 'DISCIPLINA', academicLevel: 'graduacao' as const },
  modalities: [
    { value: 'DISCIPLINA', label: 'Disciplina' },
    { value: 'ATIVIDADE', label: 'Atividade' },
    { value: 'MODULO', label: 'Módulo' },
  ],
  academicLevels: [
    { value: 'graduacao' as const, label: 'Graduação', sigaaSourceId: '1114' },
    { value: 'mestrado' as const, label: 'Mestrado', sigaaSourceId: '1820' },
    { value: 'doutorado' as const, label: 'Doutorado', sigaaSourceId: '43753' },
  ],
  sigaaSourceTypes: [
    { value: 'department' as const, label: 'Departamento' },
    { value: 'program' as const, label: 'Programa' },
  ],
  courses: [
    {
      key: 'INFORMATION_SYSTEMS_BACHELOR',
      value: 'Bacharelado em Sistemas de Informação',
      label: 'Bacharelado em Sistemas de Informação',
      aliases: ['Bacharelado em Sistemas de Informação'],
    },
    {
      key: 'PMCC',
      value: 'Programa de Pós-Graduação em Mecatrônica',
      label: 'Programa de Pós-Graduação em Mecatrônica',
      aliases: ['Programa Multidisciplinar em Ciência da Computação', 'PMCC'],
    },
  ],
};

describe('DisciplineListPage public filters', () => {
  beforeEach(() => {
    mockedGetComponentMetadata.mockResolvedValue(componentMetadata);
  });

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
    expect(screen.getByRole('heading', { name: 'Disciplinas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Disciplinas publicadas' })).not.toBeInTheDocument();
    expect(screen.getByText('Não informado')).toBeInTheDocument();
    expect(screen.queryByText('2026.2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Curso')).toHaveValue('__all__');
    expect(screen.getByLabelText('Buscar por código ou nome')).toHaveFocus();
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

    await screen.findByRole('option', { name: 'Bacharelado em Sistemas de Informa\u00e7\u00e3o' });
    await userEvent.selectOptions(screen.getByLabelText('Curso'), 'Bacharelado em Sistemas de Informa\u00e7\u00e3o');

    await waitFor(() => {
      expect(mockedGetComponents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          department: 'Bacharelado em Sistemas de Informa\u00e7\u00e3o',
        })
      );
    });
  });

  it('deve exibir o programa de mecatronica no filtro e normalizar registros antigos', async () => {
    mockedGetComponents.mockResolvedValue({
      results: [
        {
          id: 'component-pmcc',
          code: 'PMCC001',
          name: 'Topicos em Mecatronica',
          department: 'Programa Multidisciplinar em Ci\u00eancia da Computa\u00e7\u00e3o',
          academicLevel: 'mestrado',
          syllabus: 'Ementa de teste',
          userId: 'u-1',
        },
      ],
      total: 1,
      meta: {
        page: 0,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <DisciplineListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Topicos em Mecatronica')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Programa de P\u00f3s-Gradua\u00e7\u00e3o em Mecatr\u00f4nica' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Programa Multidisciplinar em Ci\u00eancia da Computa\u00e7\u00e3o' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Programa de P\u00f3s-Gradua\u00e7\u00e3o em Mecatr\u00f4nica').length).toBeGreaterThan(0);
  });

  it('deve evitar classificar programa de pos-graduacao ambiguo como mestrado', async () => {
    mockedGetComponents.mockResolvedValue({
      results: [
        {
          id: 'component-ambiguous-level',
          code: 'IC0062',
          name: 'Algoritmos Distribuidos I',
          department: 'Programa de P\u00f3s-Gradua\u00e7\u00e3o em Ci\u00eancia da Computa\u00e7\u00e3o',
          academicLevel: 'mestrado',
          syllabus: 'Ementa de teste',
          userId: 'u-1',
        },
      ],
      total: 1,
      meta: {
        page: 0,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <DisciplineListPage />
      </MemoryRouter>
    );

    const title = await screen.findByText('Algoritmos Distribuidos I');
    const row = title.closest('article');

    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('P\u00f3s-gradua\u00e7\u00e3o')).toBeInTheDocument();
    expect(within(row as HTMLElement).queryByText('Mestrado')).not.toBeInTheDocument();
  });
});
