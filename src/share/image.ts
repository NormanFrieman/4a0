/**
 * Share image export (GDD §11): renders the `ShareCard` DOM node to PNG in the
 * browser with html-to-image, then shares it (phones) or downloads it.
 */
import { toBlob } from "html-to-image";
import { downloadBlob } from "../app/download.ts";
import { SHARE_CARD_SIZE } from "../app/ui/ShareCard.tsx";

export async function renderShareImage(node: HTMLElement): Promise<Blob> {
  // html-to-image embeds the web fonts it finds; wait until Fraunces is loaded.
  await document.fonts.ready;
  const blob = await toBlob(node, { ...SHARE_CARD_SIZE, pixelRatio: 1 });
  if (!blob) throw new Error("Share image: empty render");
  return blob;
}

/**
 * Phones (coarse pointer) get the system share sheet when it accepts files;
 * everyone else, or a refused share, gets a download.
 */
export async function shareImage(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (err) {
      // The user closed the share sheet: nothing else to do.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
      // NotAllowedError (Safari loses the click after the render) and others: download.
    }
  }
  downloadBlob(filename, blob);
  return "downloaded";
}
