import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createComponentDraft } from '../lib/api';
import { DisciplineCreatePage } from './DisciplineCreatePage';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    createComponentDraft: vi.fn(),
  };
});

const mockedCreateComponentDraft = vi.mocked(createComponentDraft);

describe('DisciplineCreatePage', () => {
  it('deve criar disciplina e navegar para edição do rascunho', async () => {
    mockedCreateComponentDraft.mockResolvedValueOnce({
      id: 'draft-1',
      code: 'IC045',
      name: 'Compiladores',
    });

    render(<DisciplineCreatePage />);

    await userEvent.type(screen.getByLabelText('Codigo'), 'IC045');
    await userEvent.type(screen.getByLabelText('Nome'), 'Compiladores');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mockedCreateComponentDraft).toHaveBeenCalledTimes(1);
    });

    expect(mockedCreateComponentDraft.mock.calls[0][0]).toMatchObject({
      code: 'IC045',
      name: 'Compiladores',
    });

    expect(navigateMock).toHaveBeenCalledWith('/disciplinas/ic045/editar', { replace: true });
  });
});
