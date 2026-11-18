import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Config } from "chessground/config";
import type { Key } from "chessground/types";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.cburnett.css";
import type { MoveMark } from "../../sim/moveFeedback.ts";
import { moveMarkSvg } from "./moveMarkSvg.ts";

/** Mark of the move on its destination square (GDD §8.6). */
export interface BoardAnnotation {
  square: string;
  mark: MoveMark;
}

/** Chessground settings that draw (or clear) the annotation. */
function annotationConfig(a?: BoardAnnotation): Config {
  const key = a?.square as Key | undefined;
  return {
    drawable: {
      autoShapes:
        a && key ? [{ orig: key, customSvg: { html: moveMarkSvg(a.mark), center: "orig" } }] : [],
    },
    highlight: { custom: new Map(a && key ? [[key, `mark-${a.mark}`]] : []) },
  };
}

/**
 * Read-only chessground board in the Almanaque frame. For playback, pass a
 * new `fen` (and `lastMove`) per ply; `annotation` marks the move's square.
 */
export function BoardFrame({
  fen,
  lastMove,
  orientation = "white",
  coordinates = false,
  annotation,
  className = "",
}: {
  fen: string;
  lastMove?: readonly [string, string];
  annotation?: BoardAnnotation;
  orientation?: "white" | "black";
  coordinates?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<ReturnType<typeof Chessground> | null>(null);

  // Latest position, read when the board is (re)created so it starts there
  // instead of animating from the initial position (e.g. back from the Replay).
  const position = useRef({ fen, lastMove, annotation });
  position.current = { fen, lastMove, annotation };

  useEffect(() => {
    if (!el.current) return;
    const { fen: startFen, lastMove: startMove, annotation: startMark } = position.current;
    api.current = Chessground(el.current, {
      viewOnly: true,
      coordinates,
      orientation,
      fen: startFen,
      ...(startMove ? { lastMove: startMove as unknown as Key[] } : {}),
      ...annotationConfig(startMark),
    });
    return () => {
      api.current?.destroy();
      api.current = null;
    };
  }, [coordinates, orientation]);

  const lm = lastMove?.join("");
  const am = annotation && `${annotation.square}${annotation.mark}`;
  useEffect(() => {
    api.current?.set({
      fen,
      lastMove: lastMove ? (lastMove as unknown as Key[]) : undefined,
      ...annotationConfig(annotation),
    });
    // lastMove and annotation are compared by value through `lm` and `am`.
  }, [fen, lm, am, coordinates, orientation]);

  return (
    <div
      className={`board-almanaque border-4 border-surface shadow-[0_0_0_1px_var(--color-line)] ${className}`}
    >
      <div ref={el} className="aspect-square w-full" />
    </div>
  );
}
