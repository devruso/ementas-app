import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { ApproveDraftDialog } from './ApproveDraftDialog';
import { AppError } from '../lib/errors';
import { DisciplineEditorForm } from './DisciplineEditorForm';
import { getDisciplineFormInitialValues } from '../lib/componentDraft';

it('links publication errors directly to the missing field', () => {
  render(<MemoryRouter><ApproveDraftDialog open componentCode="IC045" password="" loadingContext={false} submitting={false} onChangePassword={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} error={new AppError('Pendente', 400, { code: 'PUBLICATION_REQUIRED_FIELDS', details: { fields: ['Objetivos'] } })} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Visualizar campos pendentes' })).toHaveAttribute('href', '/disciplinas/ic045/editar?campo=objective');
});

it('focuses the first pending form field when requested', async () => {
  render(<DisciplineEditorForm initialValues={getDisciplineFormInitialValues()} saving={false} onCancel={vi.fn()} onSave={vi.fn()} onSaveAndPublish={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Visualizar campos pendentes' }));
  expect(screen.getByRole('textbox', { name: /^Código/ })).toHaveFocus();
});
