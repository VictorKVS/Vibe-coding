export const api = {
  async post(url: string, data: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as { error?: string }).error || `HTTP ${response.status}`);
    }
    return { data: payload };
  },
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.split(',')[1] || '');
    };
    reader.readAsDataURL(blob);
  });
}

export const imageTools = {
  async resizeIfNeeded(
    file: File | Blob,
    options: {
      maxDimension?: number;
      maxPixels?: number;
      quality?: number;
      mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
    } = {}
  ) {
    const maxDimension = options.maxDimension ?? 1600;
    const maxPixels = options.maxPixels ?? 2_000_000;
    const quality = options.quality ?? 0.82;
    const mimeType = options.mimeType ?? 'image/jpeg';
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    const dimensionScale = Math.min(1, maxDimension / Math.max(width, height));
    const pixelScale = Math.min(1, Math.sqrt(maxPixels / (width * height)));
    const scale = Math.min(dimensionScale, pixelScale);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image conversion failed')), mimeType, quality);
    });

    return {
      data: await blobToBase64(blob),
      mimeType,
      width,
      height,
      bytes: blob.size,
      resized: scale < 1 || file.type !== mimeType,
    };
  },
};
