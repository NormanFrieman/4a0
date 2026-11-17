/** Save a text file in the browser (Blob + `<a download>`). */
export function downloadText(filename: string, text: string, type = "application/x-chess-pgn") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
