// Use the browser canvas API directly: trim-canvas's default export is not
// callable in some production bundles of react-signature-canvas.
export const captureSignatureFile = async (canvas: HTMLCanvasElement): Promise<File> => {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível capturar o desenho.');
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Desenhe a assinatura no quadro antes de capturar o arquivo.');
  const cropped = document.createElement('canvas');
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  const croppedContext = cropped.getContext('2d');
  if (!croppedContext) throw new Error('Não foi possível capturar o desenho.');
  croppedContext.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  const blob = await new Promise<Blob | null>((resolve) => cropped.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível capturar a assinatura desenhada. Tente novamente.');
  return new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });
};
