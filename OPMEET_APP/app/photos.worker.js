/* Optional Web Worker for image compression (stub). Not wired by default. */
self.onmessage = async (ev) => {
  const { file, maxDim = 1600 } = ev.data || {};
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    self.postMessage({ ok: true, blob, width: w, height: h });
  } catch (e) {
    self.postMessage({ ok: false, error: String(e) });
  }
};
