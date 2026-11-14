import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Key } from "chessground/types";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.cburnett.css";

/**
 * Read-only chessground board in the Almanaque frame. For playback, pass a
 * new `fen` (and `lastMove`) per ply.
 */
export function BoardFrame({
  fen,
  lastMove,
  orientation = "white",
  coordinates = false,
  className = "",
}: {
  fen: string;
  lastMove?: readonly [string, string];
  orientation?: "white" | "black";
  coordinates?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof Chessground> | null>(null);

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, { viewOnly: true, coordinates, orientation });
    return () => {
      api.current?.destroy();
      api.current = null;
    };
  }, [coordinates, orientation]);

  const lm = lastMove?.join("");
  useEffect(() => {
    api.current?.set({ fen, lastMove: lastMove ? (lastMove as unknown as Key[]) : undefined });
    // lastMove is compared by value through `lm`.
  }, [fen, lm, coordinates, orientation]);

  return (
    <div
      className={`board-almanaque border-4 border-surface shadow-[0_0_0_1px_var(--color-line)] ${className}`}
    >
      <div ref={el} className="aspect-square w-full" />
    </div>
  );
}
