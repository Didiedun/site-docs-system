// Downscale phone photos before they enter a draft/document. Full-res base64
// photos blew past Supabase Storage's file-size limit ("object exceeded the
// maximum allowed size"); capping the longest edge keeps the upload, the
// IndexedDB draft, and the generated HTML/.docx all small.

/** Longest-edge-capped dimensions, aspect ratio preserved. Never upscales. */
export function fitDimensions(w: number, h: number, max: number): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const scale = max / Math.max(w, h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

const MAX_EDGE = 1600;
const QUALITY = 0.72;

/** Resize an image file to a JPEG data URL. Falls back to the raw file as a
 *  data URL if the browser can't decode it (e.g. HEIC without support). */
export function downscaleToJpeg(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight, MAX_EDGE);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return void readRaw(file, resolve);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(url); readRaw(file, resolve); };
    img.src = url;
  });
}

function readRaw(file: File, resolve: (dataUrl: string) => void) {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.readAsDataURL(file);
}
