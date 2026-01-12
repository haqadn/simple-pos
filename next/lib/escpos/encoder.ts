// Image encoding utilities for ESC/POS printing

/**
 * Convert a base64 image to 1-bit raster format for ESC/POS printing
 * This runs in the browser using Canvas API
 */
export async function encodeImageForPrint(
  base64: string,
  maxWidth: number = 384
): Promise<{ data: Uint8Array; widthBytes: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate dimensions (maintain aspect ratio)
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.floor(height * ratio);
        }

        // Width must be divisible by 8 for raster format
        width = Math.floor(width / 8) * 8;
        const widthBytes = width / 8;

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        // Convert to 1-bit bitmap (black = 1, white = 0)
        const rasterData = new Uint8Array(widthBytes * height);

        for (let y = 0; y < height; y++) {
          for (let xByte = 0; xByte < widthBytes; xByte++) {
            let byte = 0;

            for (let bit = 0; bit < 8; bit++) {
              const x = xByte * 8 + bit;
              const pixelIndex = (y * width + x) * 4;

              // Get pixel luminance (simple average)
              const r = pixels[pixelIndex];
              const g = pixels[pixelIndex + 1];
              const b = pixels[pixelIndex + 2];
              const luminance = (r + g + b) / 3;

              // Threshold: < 128 = black (bit = 1)
              if (luminance < 128) {
                byte |= 1 << (7 - bit);
              }
            }

            rasterData[y * widthBytes + xByte] = byte;
          }
        }

        resolve({ data: rasterData, widthBytes, height });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Resize an image to fit within maxWidth while maintaining aspect ratio
 * Returns a new base64 string
 */
export async function resizeImage(
  base64: string,
  maxWidth: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (img.width <= maxWidth) {
        resolve(base64);
        return;
      }

      const ratio = maxWidth / img.width;
      const newWidth = maxWidth;
      const newHeight = Math.floor(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for resize'));
    };

    img.src = base64;
  });
}
