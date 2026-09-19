/**
 * Decodes a COCO Run-Length Encoded (RLE) mask and draws it onto a canvas.
 * Standard COCO RLE consists of a 'counts' string (or array) and a 'size' [h, w].
 */
export const renderRLEMask = (
  ctx: CanvasRenderingContext2D,
  rleString: string,
  width: number,
  height: number,
  color: string = 'rgba(0, 119, 190, 0.5)'
) => {
  try {
    if (!rleString) return;

    const data = typeof rleString === 'string' ? JSON.parse(rleString) : rleString;
    const { counts, size } = data; // size: [height, width]
    
    if (!counts || !size) {
      console.error('Invalid RLE data: missing counts or size');
      return;
    }

    const [h, w] = size;
    const mask = new Uint8Array(h * w);

    if (typeof counts === 'string') {
      // COCO RLE string format: alternating lengths of 0s and 1s
      const countValues = counts.split(' ').map(Number);
      let currentPos = 0;
      for (let i = 0; i < countValues.length; i++) {
        const length = countValues[i];
        const value = i % 2 === 0 ? 0 : 1;
        for (let j = 0; j < length; j++) {
          if (currentPos < mask.length) {
            mask[currentPos++] = value;
          }
        }
      }
    } else if (Array.isArray(counts)) {
      // Simplified [value, length] format (kept for backward compatibility)
      let currentPos = 0;
      for (let i = 0; i < counts.length; i += 2) {
        const value = counts[i];
        const length = counts[i + 1];
        for (let j = 0; j < length; j++) {
          if (currentPos < mask.length) {
            mask[currentPos++] = value;
          }
        }
      }
    }

    // Render mask to canvas
    const imgData = ctx.createImageData(w, h);
    const rgba = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const r = rgba ? parseInt(rgba[1]) : 0;
    const g = rgba ? parseInt(rgba[2]) : 119;
    const b = rgba ? parseInt(rgba[3]) : 190;
    const a = rgba ? (parseFloat(rgba[4]) || 1.0) * 255 : 127;

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        const idx = i * 4;
        imgData.data[idx] = r;
        imgData.data[idx + 1] = g;
        imgData.data[idx + 2] = b;
        imgData.data[idx + 3] = a;
      }
    }

    // Scale mask to fit the current canvas dimensions
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCanvas.getContext('2d')?.putImageData(imgData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, width, height);
  } catch (e) {
    console.error('RLE Decoding error:', e);
  }
};
