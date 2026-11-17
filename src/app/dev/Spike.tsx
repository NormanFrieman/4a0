/**
 * Dev page: Maia-3 in a Web Worker (GDD §8). Plays one game with a live
 * board, or a full round (4 games) to check the performance target
 * (< 10 s per round, GDD §8.3) and determinism (same seed → same PGNs).
 * Not part of the game.
 */
import { useEffect, useRef, useState } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Key } from "chessground/types";
import { MaiaWorkerPool } from "../../engine/workerPool.ts";
import type { GameJob, GameSide } from "../../engine/types.ts";
import type { MaiaVariant } from "../../engine/workerProtocol.ts";
import { engineParamsForRating } from "../../engine/engineParams.ts";
import { balance } from "../../config/balance.ts";
import { hashSeed } from "../../rng/rng.ts";
import { modelUrl, stockfishUrl } from "../state/engineUrls.ts";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const ORT_WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

type Metrics = Record<string, string | number | boolean>;

const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
};

function heapMB(): number | undefined {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : undefined;
}

/** `?workers=` / `?threads=` override the pool size, to compare setups on one device. */
function poolOverride(): { size?: number; threads?: number } {
  const q = new URLSearchParams(location.search);
  const num = (k: string) => {
    const n = Number(q.get(k));
    return Number.isInteger(n) && n > 0 ? n : undefined;
  };
  return { size: num("workers"), threads: num("threads") };
}

/** Game rating (calibrated scale) → worker side. */
const sideFor = (rating: number): GameSide => {
  const p = engineParamsForRating(rating);
  return {
    name: `Jogo ${rating}`,
    selfElo: p.selfElo,
    temperature: p.temperature,
    topP: balance.game.topP,
  };
};

export function Spike() {
  const boardEl = useRef<HTMLDivElement>(null);
  const ground = useRef<Api | null>(null);
  const client = useRef<MaiaWorkerPool | null>(null);
  const [variant, setVariant] = useState<MaiaVariant>("5m");
  const [forceWasm, setForceWasm] = useState(true);
  const [blunderCheck, setBlunderCheck] = useState(true);
  const [whiteRating, setWhiteRating] = useState(1700);
  const [blackRating, setBlackRating] = useState(1650);
  const [seed, setSeed] = useState("spike-1");
  const [status, setStatus] = useState("Pronto.");
  const [running, setRunning] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pgn, setPgn] = useState("");
  const lastRoundHash = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!boardEl.current) return;
    ground.current = Chessground(boardEl.current, { viewOnly: true, coordinates: true });
    return () => {
      ground.current?.destroy();
      client.current?.dispose();
    };
  }, []);

  async function ensureClient(m: Metrics) {
    if (!client.current) {
      const { size, threads } = poolOverride();
      client.current = new MaiaWorkerPool(size, threads);
    }
    setStatus("Carregando modelo no worker…");
    const info = await client.current.init(
      {
        variant,
        ...(modelUrl(variant) ? { modelUrl: modelUrl(variant) } : {}),
        forceWasm,
        wasmPaths: ORT_WASM_CDN,
        ...(blunderCheck ? { stockfishUrl: stockfishUrl() } : {}),
      },
      (l, t) => setStatus(`Baixando modelo… ${t ? Math.round((l / t) * 100) : "?"}%`),
    );
    Object.assign(m, {
      "Download (ms)": info.downloadMs,
      "Init da sessão (ms)": info.initMs,
      "Modelo (MB)": Math.round(info.modelBytes / 1024 / 1024),
      "Isolamento cross-origin": info.crossOriginIsolated,
      Workers: client.current.size,
      "Threads por worker": client.current.threads,
    });
  }

  function baseMetrics(): Metrics {
    return {
      Variante: variant,
      "Só WASM": forceWasm,
      "Filtro Stockfish": blunderCheck,
      "Núcleos lógicos": navigator.hardwareConcurrency,
    };
  }

  async function guard(fn: () => Promise<void>) {
    setRunning(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setStatus(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  const playOne = () =>
    guard(async () => {
      setPgn("");
      ground.current?.set({ fen: "start", lastMove: undefined });
      const m = baseMetrics();
      await ensureClient(m);
      setMetrics({ ...m });
      setStatus("Jogando…");
      const t0 = performance.now();
      const job: GameJob = { white: sideFor(whiteRating), black: sideFor(blackRating), seed };
      const { record, latenciesMs } = await client.current!.playGameWithStats(job, (mv) => {
        ground.current?.set({
          fen: mv.fenAfter,
          lastMove: [mv.uci.slice(0, 2) as Key, mv.uci.slice(2, 4) as Key],
        });
        setStatus(`Jogando… lance ${mv.ply + 1} (${mv.san})`);
      });
      const warm = latenciesMs.slice(1);
      Object.assign(m, {
        "Partida (ms)": Math.round(performance.now() - t0),
        "Meios-lances": record.moves.length,
        "Lances de livro": record.moves.filter((x) => x.source === "book").length,
        "Latência p50 (ms)": Math.round(percentile(warm, 50) * 10) / 10,
        "Latência p95 (ms)": Math.round(percentile(warm, 95) * 10) / 10,
        Resultado: `${record.result} (${record.termination})`,
      });
      const heap = heapMB();
      if (heap !== undefined) m["Heap JS da página (MB)"] = heap;
      setMetrics({ ...m });
      setPgn(record.pgn);
      setStatus("Partida concluída.");
    });

  const playRound = () =>
    guard(async () => {
      setPgn("");
      const m = baseMetrics();
      await ensureClient(m);
      setMetrics({ ...m });
      setStatus("Calculando rodada (4 partidas)…");
      const t0 = performance.now();
      const jobs: GameJob[] = [0, 1, 2, 3].map((board) => {
        const userWhite = board % 2 === 0; // Boards 1 and 3: first team has white (GDD §5.2).
        const a = sideFor(whiteRating - board * 50);
        const b = sideFor(blackRating - board * 50);
        return {
          white: userWhite ? a : b,
          black: userWhite ? b : a,
          seed: `${seed}/r1/b${board + 1}`,
          headers: { Round: "1", Board: String(board + 1) },
        };
      });
      const results = await Promise.all(jobs.map((j) => client.current!.playGameWithStats(j)));
      const roundMs = Math.round(performance.now() - t0);
      const pgns = results.map((r) => r.record.pgn).join("\n\n");
      const hash = hashSeed(pgns);
      const key = `${seed}/${whiteRating}/${blackRating}/${variant}/${forceWasm}/${blunderCheck}`;
      const prev = lastRoundHash.current[key];
      lastRoundHash.current[key] = hash;
      Object.assign(m, {
        "Rodada (ms)": roundMs,
        "Meta < 10 s": roundMs < 10_000 ? "ok" : "acima",
        "Meios-lances (total)": results.reduce((s, r) => s + r.record.moves.length, 0),
        Resultados: results.map((r) => `${r.record.result} ${r.record.termination}`).join(" · "),
        "Hash dos PGNs": hash.toString(16),
        Determinismo:
          prev === undefined
            ? "rode de novo para comparar"
            : prev === hash
              ? "idêntico"
              : "DIFERENTE",
      });
      setMetrics({ ...m });
      setPgn(pgns);
      setStatus("Rodada concluída.");
    });

  return (
    <main className="page">
      <h1>Spike: Maia-3 em workers</h1>
      <div className="controls">
        <label>
          Variante
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as MaiaVariant)}
            disabled={!!client.current}
          >
            <option value="5m">5M</option>
            <option value="23m">23M</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={forceWasm}
            onChange={(e) => setForceWasm(e.target.checked)}
            disabled={!!client.current}
          />
          Só WASM
        </label>
        <label>
          <input
            type="checkbox"
            checked={blunderCheck}
            onChange={(e) => setBlunderCheck(e.target.checked)}
            disabled={!!client.current}
          />
          Filtro Stockfish
        </label>
        <label>
          Brancas (rating do jogo)
          <input
            type="number"
            value={whiteRating}
            onChange={(e) => setWhiteRating(+e.target.value)}
          />
        </label>
        <label>
          Pretas (rating do jogo)
          <input
            type="number"
            value={blackRating}
            onChange={(e) => setBlackRating(+e.target.value)}
          />
        </label>
        <label>
          Semente
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button onClick={playOne} disabled={running}>
          Jogar partida
        </button>
        <button onClick={playRound} disabled={running}>
          Jogar rodada (4)
        </button>
      </div>
      <p className="status">{status}</p>
      <div className="spike">
        <div ref={boardEl} className="board" />
        <div>
          {metrics && (
            <>
              <table className="metrics">
                <tbody>
                  {Object.entries(metrics).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(metrics, null, 2))}
                >
                  Copiar métricas (JSON)
                </button>
              </p>
            </>
          )}
          {pgn && <textarea readOnly value={pgn} rows={10} style={{ width: "100%" }} />}
        </div>
      </div>
    </main>
  );
}
