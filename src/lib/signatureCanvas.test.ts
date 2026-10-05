import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureSignatureFile } from './signatureCanvas';

afterEach(() => vi.restoreAllMocks());

describe('captureSignatureFile', () => {
  const prepareCanvas = (withInk: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 6;
    const data = new Uint8ClampedArray(10 * 6 * 4);
    if (withInk) {
      data[(2 * 10 + 3) * 4 + 3] = 255;
      data[(4 * 10 + 7) * 4 + 3] = 255;
    }
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ getImageData: () => ({ data }), drawImage }) as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })));
    return { canvas, drawImage };
  };

  it('crops transparent margins and returns an uploadable PNG', async () => {
    const { canvas, drawImage } = prepareCanvas(true);
    const file = await captureSignatureFile(canvas);
    expect(drawImage).toHaveBeenCalledWith(canvas, 3, 2, 5, 3, 0, 0, 5, 3);
    expect(file.type).toBe('image/png');
    expect(file.size).toBeGreaterThan(0);
  });

  it('rejects a blank canvas', async () => {
    const { canvas } = prepareCanvas(false);
    await expect(captureSignatureFile(canvas)).rejects.toThrow('Desenhe a assinatura');
  });

  it('reports PNG encoding failures', async () => {
    const { canvas } = prepareCanvas(true);
    vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementation((callback) => callback(null));
    await expect(captureSignatureFile(canvas)).rejects.toThrow('Não foi possível capturar');
  });
});
