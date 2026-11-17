import { describe, expect, it } from "vitest";
import { poolSizeFor, threadsPerWorkerFor } from "./workerPool.ts";

describe("pool sizing", () => {
  it.each([
    [1, 1, 1],
    [2, 1, 2],
    [4, 3, 1],
    [8, 4, 2],
    [12, 4, 3],
  ])("%i cores → %i workers × %i ORT threads", (cores, size, threads) => {
    expect(poolSizeFor(cores)).toBe(size);
    expect(threadsPerWorkerFor(cores, size)).toBe(threads);
  });

  it("never asks for more ORT threads than cores", () => {
    for (let cores = 1; cores <= 32; cores++) {
      const size = poolSizeFor(cores);
      expect(size * threadsPerWorkerFor(cores, size)).toBeLessThanOrEqual(cores);
    }
  });
});
