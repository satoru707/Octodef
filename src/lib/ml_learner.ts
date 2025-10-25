import { randomUUID } from "crypto";

export interface LOFModel {
  version: string;
  trainedAt: string;
  trainingSamples: number;
  k: number;
  contamination: number;
  scaler: { min: number[]; max: number[] };
  distancesMatrix: number[][];
  kDistances: number[];
  reachabilityCache: number[][];
}

export class EnterpriseLOF {
  private model: LOFModel | null = null;
  private readonly k: number;
  private readonly contamination: number;
  private readonly version = `v${Date.now()}-${randomUUID().slice(0, 8)}`;

  constructor(config: { kNeighbors?: number; contamination?: number } = {}) {
    this.k = Math.max(1, config.kNeighbors ?? 30);
    this.contamination = Math.max(
      0.001,
      Math.min(0.5, config.contamination ?? 0.05)
    );
  }

  train(trainingData: number[][]): LOFModel {
    if (trainingData.length < 100)
      throw new Error("Insufficient training data (min 100 samples)");

    const { scaled, min, max } = this._normalize(trainingData);

    const n = scaled.length;

    const distances = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = this._euclidean(scaled[i], scaled[j]);
        distances[i][j] = distances[j][i] = d;
      }
    }

    const kDistances = distances.map(
      (row) => [...row].sort((a, b) => a - b)[Math.min(this.k, n - 1)]
    );

    const reachability = distances.map((row, i) => {
      const neighbors = row
        .map((d, idx) => ({ d, idx }))
        .filter((x) => x.idx !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, this.k)
        .map((p) => Math.max(kDistances[i], p.d));
      return neighbors;
    });

    this.model = {
      version: this.version,
      trainedAt: new Date().toISOString(),
      trainingSamples: n,
      k: this.k,
      contamination: this.contamination,
      scaler: { min, max },
      distancesMatrix: distances,
      kDistances,
      reachabilityCache: reachability,
    };

    return this.model;
  }

  predict(data: number[][]): {
    scores: number[];
    labels: number[];
    anomalyRate: number;
  } {
    if (!this.model) throw new Error("Model must be trained first");
    if (data.length === 0) return { scores: [], labels: [], anomalyRate: 0 };

    const { scaled } = this._normalize(
      data,
      this.model.scaler.min,
      this.model.scaler.max
    );
    const n = scaled.length;
    const scores: number[] = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const dists = scaled.map((q) => this._euclidean(scaled[i], q));
      const neighbors = dists
        .map((d, idx) => ({ d, idx }))
        .filter((x) => x.idx !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, this.model.k);

      if (neighbors.length === 0) {
        scores[i] = 1;
        continue;
      }

      const kDistP = neighbors[neighbors.length - 1].d;
      const lrdP =
        neighbors.length /
        neighbors.reduce((s, nb) => s + Math.max(kDistP, nb.d), 0);

      let sumLRD = 0;
      for (const nb of neighbors) {
        const distsO = scaled.map((q) => this._euclidean(scaled[nb.idx], q));
        const neighO = distsO
          .map((d, idx) => ({ d, idx }))
          .filter((x) => x.idx !== nb.idx)
          .sort((a, b) => a.d - b.d)
          .slice(0, this.model.k);
        const kDistO = neighO[neighO.length - 1]?.d || 1e-6;
        const lrdO =
          neighO.length / neighO.reduce((s, o) => s + Math.max(kDistO, o.d), 0);
        sumLRD += lrdO;
      }

      scores[i] = sumLRD / (neighbors.length * lrdP);
    }

    const threshold = this._percentile(
      scores,
      100 - this.model.contamination * 100
    );
    const labels = scores.map((s) => (s > threshold ? 1 : 0));
    const anomalyRate = labels.filter((l) => l === 1).length / n;
    return { scores, labels, anomalyRate };
  }

  exportModel(): LOFModel | null {
    return this.model;
  }

  loadModel(model: LOFModel): void {
    this.model = model;
  }

  private _euclidean(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      sum += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
    }
    return Math.sqrt(sum);
  }

  private _normalize(
    data: number[][],
    min?: number[],
    max?: number[]
  ): { scaled: number[][]; min: number[]; max: number[] } {
    const cols = data[0]?.length || 0;
    const newMin = min || new Array(cols).fill(Infinity);
    const newMax = max || new Array(cols).fill(-Infinity);

    if (!min || !max) {
      for (const row of data) {
        for (let i = 0; i < cols; i++) {
          newMin[i] = Math.min(newMin[i], row[i]);
          newMax[i] = Math.max(newMax[i], row[i]);
        }
      }
    }

    const scaled = data.map((row) =>
      row.map((v, i) =>
        newMax[i] - newMin[i] === 0
          ? 0
          : (v - newMin[i]) / (newMax[i] - newMin[i])
      )
    );

    return { scaled, min: newMin, max: newMax };
  }

  private _percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const i = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(i),
      hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
}

export const lofRegistry = {
  baseline: new EnterpriseLOF({ kNeighbors: 30, contamination: 0.05 }),
  adaptive: new EnterpriseLOF({ kNeighbors: 25, contamination: 0.1 }),
};
