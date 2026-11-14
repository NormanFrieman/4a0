/**
 * Spike (GDD §10.6): play a full AI-vs-AI game with Maia-3 in the browser
 * and record download time, latency per move and memory.
 * Not a game mode — nothing here affects resources or rating.
 */
import { useEffect, useRef, useState } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Key } from "chessground/types";
import { ensureModelWeb, Maia3 } from "maia3-js/web";
import { Maia3Engine, playGame, type ChessAI, type GameRecord } from "../../engine/index.ts";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

const ORT_WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

type Variant = "5m" | "23m";

interface Metrics {
  variant: Variant;
  crossOriginIsolated: boolean;
  hardwareConcurrency: number;
  userAgent: string;
  downloadMs?: number;
  modelBytes?: number;
  sessionInitMs?: number;
  firstMoveMs?: number;
  p50Ms?: number;
  p95Ms?: number;
  maxMs?: number;
  plies?: number;
  gameMs?: number;
  heapMB?: number;
  result?: string;
  termination?: string;
}

const percentile = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
};

function heapMB(): number | undefined {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : undefined;
}

const LABELS: Record<string, string> = {
  variant: "Variante",
  crossOriginIsolated: "Isolamento cross-origin (threads)",
  hardwareConcurrency: "Núcleos lógicos",
  downloadMs: "Download do modelo (ms)",
  modelBytes: "Tamanho do modelo (MB)",
  sessionInitMs: "Inicialização da sessão (ms)",
  firstMoveMs: "Primeiro lance (ms)",
  p50Ms: "Latência p50 (ms)",
  p95Ms: "Latência p95 (ms)",
  maxMs: "Latência máx. (ms)",
  plies: "Meios-lances",
  gameMs: "Duração da partida (ms)",
  heapMB: "Heap JS (MB, só Chrome)",
  result: "Resultado",
  termination: "Fim por",
};

export function Spike() {
  const boardEl = useRef<HTMLDivElement>(null);
  const ground = useRef<Api | null>(null);
  const [variant, setVariant] = useState<Variant>("5m");
  const [whiteElo, setWhiteElo] = useState(1500);
  const [blackElo, setBlackElo] = useState(1500);
  const [seed, setSeed] = useState("spike-1");
  const [status, setStatus] = useState("Pronto.");
  const [running, setRunning] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pgn, setPgn] = useState("");

  useEffect(() => {
    if (!boardEl.current) return;
    ground.current = Chessground(boardEl.current, { viewOnly: true, coordinates: true });
    return () => ground.current?.destroy();
  }, []);

  async function run() {
    setRunning(true);
    setPgn("");
    ground.current?.set({ fen: "start", lastMove: undefined });
    const m: Metrics = {
      variant,
      crossOriginIsolated: self.crossOriginIsolated,
      hardwareConcurrency: navigator.hardwareConcurrency,
      userAgent: navigator.userAgent,
    };
    setMetrics({ ...m });
    let maia: Maia3 | null = null;
    try {
      setStatus("Baixando modelo…");
      const t0 = performance.now();
      const bytes = await ensureModelWeb({
        variant,
        onProgress: (loaded, total) =>
          setStatus(`Baixando modelo… ${total ? Math.round((loaded / total) * 100) : "?"}%`),
      });
      m.downloadMs = Math.round(performance.now() - t0);
      m.modelBytes = Math.round(bytes.byteLength / 1024 / 1024);

      setStatus("Inicializando sessão ONNX…");
      const t1 = performance.now();
      maia = new Maia3({ variant, modelBytes: bytes, wasmPaths: ORT_WASM_CDN });
      await maia.load();
      m.sessionInitMs = Math.round(performance.now() - t1);
      setMetrics({ ...m });

      const engine = new Maia3Engine(maia);
      const latencies: number[] = [];
      const timed: ChessAI = {
        async chooseMove(req) {
          const t = performance.now();
          const r = await engine.chooseMove(req);
          latencies.push(performance.now() - t);
          return r;
        },
      };

      setStatus("Jogando…");
      const tg = performance.now();
      const game: GameRecord = await playGame({
        white: { ai: timed, elo: whiteElo, temperature: 1, topP: 1, name: `Maia ${whiteElo}` },
        black: { ai: timed, elo: blackElo, temperature: 1, topP: 1, name: `Maia ${blackElo}` },
        seed,
        onMove: async (mv) => {
          ground.current?.set({
            fen: mv.fenAfter,
            lastMove: [mv.uci.slice(0, 2) as Key, mv.uci.slice(2, 4) as Key],
          });
          setStatus(`Jogando… lance ${mv.ply + 1} (${mv.san})`);
          // Yield so the board repaints between moves.
          await new Promise((r) => requestAnimationFrame(() => r(null)));
        },
      });
      const warm = latencies.slice(1);
      Object.assign(m, {
        gameMs: Math.round(performance.now() - tg),
        plies: game.moves.length,
        firstMoveMs: Math.round(latencies[0] ?? 0),
        p50Ms: Math.round(percentile(warm, 50) * 10) / 10,
        p95Ms: Math.round(percentile(warm, 95) * 10) / 10,
        maxMs: Math.round(Math.max(...warm) * 10) / 10,
        heapMB: heapMB(),
        result: game.result,
        termination: game.termination,
      });
      setMetrics({ ...m });
      setPgn(game.pgn);
      setStatus("Partida concluída.");
    } catch (err) {
      console.error(err);
      setStatus(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await maia?.close();
      setRunning(false);
    }
  }

  return (
    <main className="page">
      <h1>Spike: Maia-3 no navegador</h1>
      <div className="controls">
        <label>
          Variante
          <select value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
            <option value="5m">5M</option>
            <option value="23m">23M</option>
          </select>
        </label>
        <label>
          Brancas (rating)
          <input type="number" value={whiteElo} onChange={(e) => setWhiteElo(+e.target.value)} />
        </label>
        <label>
          Pretas (rating)
          <input type="number" value={blackElo} onChange={(e) => setBlackElo(+e.target.value)} />
        </label>
        <label>
          Semente
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button onClick={run} disabled={running}>
          {running ? "Jogando…" : "Jogar partida"}
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
                  {Object.entries(LABELS).map(([k, label]) =>
                    metrics[k as keyof Metrics] !== undefined ? (
                      <tr key={k}>
                        <td>{label}</td>
                        <td>{String(metrics[k as keyof Metrics])}</td>
                      </tr>
                    ) : null,
                  )}
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
