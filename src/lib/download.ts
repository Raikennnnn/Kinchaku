/**
 * Hands a file to the user. On phones that support it, the share sheet opens
 * (save to Files, send to Drive, etc.); elsewhere it downloads.
 */
export async function saveFile(name: string, content: string, type: string): Promise<void> {
  const file = new File([content], name, { type });
  if (navigator.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return; // user closed the sheet
      // Otherwise fall through to a normal download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFile(file: File, maxBytes = 20 * 1024 * 1024): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error("That file is too large."));
  return file.text();
}
