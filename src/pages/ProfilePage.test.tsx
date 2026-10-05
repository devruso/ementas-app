import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfilePage } from './ProfilePage';
import { getUserSignatureFilePreview, updateUserSignature, uploadUserSignatureFile } from '../lib/api';

const refreshUserMock = vi.fn();
const captureSignatureFileMock = vi.fn();
const canvasEmptyMock = vi.fn(() => false);
const signatureUser = {
  id: 'u1', name: 'Professor Teste', email: 'professor@ufba.br', role: 'teacher',
  hasSignatureConfigured: true, hasSignatureFileConfigured: true,
  signatureUpdatedAt: '2026-05-10T10:00:00.000Z',
  signatureFileKey: 'signatures/u1-old.png', signatureFileContentType: 'image/png',
};

vi.mock('../lib/signatureCanvas', () => ({ captureSignatureFile: (...args: unknown[]) => captureSignatureFileMock(...args) }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: signatureUser,
    refreshUser: refreshUserMock,
  }),
}));

vi.mock('react-signature-canvas', () => {
  const MockSignatureCanvas = forwardRef((props: { clearOnResize?: boolean }, ref) => {
    useImperativeHandle(ref, () => ({
      isEmpty: canvasEmptyMock,
      getCanvas: () => document.createElement('canvas'),
      clear: () => undefined,
      toDataURL: () => 'data:image/png;base64,bW9jay1zaWduYXR1cmU=',
      fromDataURL: () => Promise.resolve(),
      getTrimmedCanvas: () => ({
        toBlob: (callback: (blob: Blob | null) => void) => callback(new Blob(['mock-signature'], { type: 'image/png' })),
      }),
    }));

    return <div data-testid="mock-signature-canvas" data-clear-on-resize={String(props.clearOnResize)} />;
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
    signatureUser.hasSignatureFileConfigured = true;
    signatureUser.signatureFileKey = 'signatures/u1-old.png';
    signatureUser.signatureFileContentType = 'image/png';
    canvasEmptyMock.mockReturnValue(false);
    captureSignatureFileMock.mockResolvedValue(new File(['drawn'], 'assinatura-desenhada.png', { type: 'image/png' }));
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
      expect(mockedUpdateUserSignature).toHaveBeenCalledWith('Assina123!', false);
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

  it('deve bloquear arquivo de assinatura acima de 2MB no front', async () => {
    const user = userEvent.setup();

    render(<ProfilePage />);

    const oversizedFile = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'assinatura.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Arquivo de assinatura (PNG, JPG ou WEBP)'), oversizedFile);

    expect(await screen.findByText('Arquivo de assinatura excede 2MB.')).toBeInTheDocument();
    expect(mockedUploadUserSignatureFile).not.toHaveBeenCalled();
  });

  it('deve capturar o desenho para envio e preservar o canvas em redimensionamentos', async () => {
    const user = userEvent.setup();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: 'Desenhar assinatura' }));
    expect(screen.getByTestId('mock-signature-canvas')).toHaveAttribute('data-clear-on-resize', 'false');
    await user.click(screen.getByRole('button', { name: 'Capturar assinatura desenhada' }));

    expect(anchorClick).not.toHaveBeenCalled();
    expect(await screen.findByText(/desenho capturado/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar assinatura' }));
    expect(mockedUploadUserSignatureFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'assinatura-desenhada.png' }), undefined);
  });

  it('deve indicar configuração salva sem exibir caminhos internos', async () => {
    render(<ProfilePage />);
    expect(screen.getByText('Assinatura textual salva. Deixe o campo vazio para manter a atual.')).toBeInTheDocument();
    expect(screen.getByLabelText('Assinatura')).toHaveAttribute('placeholder', expect.stringContaining('já configurada'));
    expect(screen.queryByText(/Arquivo persistido|signatures\/|Tipo de arquivo/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-signature-canvas')).not.toBeInTheDocument();
  });

  it('deve recusar envio vazio sem mudar a assinatura salva', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);
    await user.click(screen.getByRole('button', { name: 'Atualizar assinatura' }));
    expect(screen.getByText(/Nenhuma alteração para salvar/)).toBeInTheDocument();
    expect(mockedUpdateUserSignature).not.toHaveBeenCalled();
    expect(mockedUploadUserSignatureFile).not.toHaveBeenCalled();
  });

  it('deve remover a imagem na prévia e persistir a remoção ao salvar', async () => {
    const user = userEvent.setup();
    refreshUserMock.mockImplementationOnce(async () => {
      signatureUser.hasSignatureFileConfigured = false;
      signatureUser.signatureFileKey = '';
      signatureUser.signatureFileContentType = '';
    });
    const { unmount } = render(<ProfilePage />);
    await screen.findByRole('img', { name: 'Prévia da assinatura' });
    await user.click(screen.getByRole('button', { name: 'Remover imagem' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar assinatura' }));
    await screen.findByText('Assinatura atualizada com sucesso.');
    expect(mockedUpdateUserSignature).toHaveBeenCalledWith(undefined, true);
    unmount();
    render(<ProfilePage />);
    expect(screen.getByText('Nenhuma imagem de assinatura salva.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('deve mostrar falha de captura sem perder a imagem salva', async () => {
    const user = userEvent.setup();
    captureSignatureFileMock.mockRejectedValueOnce(new Error('Falha ao capturar desenho.'));
    render(<ProfilePage />);
    await user.click(screen.getByRole('button', { name: 'Desenhar assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Capturar assinatura desenhada' }));
    expect(await screen.findByText('Falha ao capturar desenho.')).toBeInTheDocument();
    expect(mockedUploadUserSignatureFile).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Prévia da assinatura' })).toBeInTheDocument();
  });
});
