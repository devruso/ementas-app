import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePage } from './ProfilePage';
import { getUserSignatureFilePreview, updateUserSignature, uploadUserSignatureFile } from '../lib/api';

const refreshUserMock = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      name: 'Professor Teste',
      email: 'professor@ufba.br',
      role: 'teacher',
      signatureUpdatedAt: '2026-05-10T10:00:00.000Z',
      signatureFileKey: 'signatures/u1-old.png',
      signatureFileContentType: 'image/png',
    },
    refreshUser: refreshUserMock,
  }),
}));

vi.mock('react-signature-canvas', () => {
  const MockSignatureCanvas = forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      isEmpty: () => false,
      clear: () => undefined,
      getTrimmedCanvas: () => ({
        toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(['mock-signature'], { type: 'image/png' })),
      }),
    }));

    return <div data-testid="mock-signature-canvas" />;
  });

  return {
    default: MockSignatureCanvas,
  };
});

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');

  return {
    ...actual,
    updateUserEmail: vi.fn(),
    updateUserPassword: vi.fn(),
    getUserSignatureFilePreview: vi.fn(),
    updateUserSignature: vi.fn(),
    uploadUserSignatureFile: vi.fn(),
  };
});

const mockedGetUserSignatureFilePreview = vi.mocked(getUserSignatureFilePreview);
const mockedUpdateUserSignature = vi.mocked(updateUserSignature);
const mockedUploadUserSignatureFile = vi.mocked(uploadUserSignatureFile);

describe('ProfilePage signature integration', () => {
  beforeEach(() => {
    mockedGetUserSignatureFilePreview.mockResolvedValue(new Blob(['persisted-signature'], { type: 'image/png' }));
    mockedUpdateUserSignature.mockResolvedValue();
    mockedUploadUserSignatureFile.mockResolvedValue();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:signature-preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('deve enviar assinatura textual quando não houver arquivo', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Assinatura'), 'Assina123!');
    await user.click(screen.getByRole('button', { name: 'Atualizar assinatura' }));

    await waitFor(() => {
      expect(mockedUpdateUserSignature).toHaveBeenCalledWith('Assina123!');
    });

    expect(mockedUploadUserSignatureFile).not.toHaveBeenCalled();
    expect(refreshUserMock).toHaveBeenCalled();
  });

  it('deve enviar arquivo de assinatura no endpoint multipart', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    const file = new File(['signature-binary'], 'assinatura.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Arquivo de assinatura (PNG, JPG ou WEBP)'), file);
    await user.type(screen.getByLabelText('Assinatura'), 'Assina123!');
    await user.click(screen.getByRole('button', { name: 'Atualizar assinatura' }));

    await waitFor(() => {
      expect(mockedUploadUserSignatureFile).toHaveBeenCalledWith(file, 'Assina123!');
    });
  });

  it('deve exibir preview visual da assinatura persistida', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockedGetUserSignatureFilePreview).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('img', { name: 'Prévia da assinatura' })).toHaveAttribute('src', 'blob:signature-preview');
  });
});
