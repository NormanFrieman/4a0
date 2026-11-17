/** Save a file in the browser (Blob + `<a download>`). */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Save a text file in the browser. */
export function downloadText(filename: string, text: string, type = "application/x-chess-pgn") {
  downloadBlob(filename, new Blob([text], { type }));
}
