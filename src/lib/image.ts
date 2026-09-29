/** Largest file we'll try to read; phone photos are usually well under this. */
const MAX_BYTES = 15 * 1024 * 1024;
/** Side of the square icon we store. Small enough to sync as plain data. */
const ICON_SIZE = 160;

/** Only raster image data URLs we produced ourselves are shown as icons. */
export const ICON_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Turns a picked image into a small square icon: centre-cropped, scaled to
 * 160px and re-encoded. Redrawing through a canvas also drops anything that
 * isn't pixels (location data, embedded scripts in SVGs).
 */
export async function fileToIcon(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is too large. Pick one under 15 MB.");

  const url = URL.createObjectURL(file);
  try {
    // An <img> decodes everything the browser can show, including HEIC on iPhone.
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode().catch(() => {
      throw new Error("Couldn't read that image. Try a PNG or JPG.");
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("Couldn't read that image. Try a PNG or JPG.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = ICON_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't process that image.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      ICON_SIZE,
      ICON_SIZE,
    );

    // WebP where supported (small); browsers without WebP encoding return PNG.
    const data = canvas.toDataURL("image/webp", 0.86);
    if (!ICON_DATA_URL.test(data)) throw new Error("Couldn't process that image.");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
