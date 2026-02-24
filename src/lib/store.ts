// Simple in-memory job store (works fine for single-user personal tool)
// Each job tracks the full pipeline: upload → kling → ffmpeg → done

export type JobStatus =
  | "uploading"
  | "generating"    // waiting for Kling
  | "processing"    // FFmpeg post-processing
  | "done"
  | "error";

export interface Job {
  id: string;
  status: JobStatus;
  dishName: string;
  imagePath: string;
  klingTaskId?: string;
  rawVideoPath?: string;
  outputs?: {
    tiktok: string;
    youtube: string;
    xiaohongshu: string;
  };
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Global store — uses Node.js global to survive Next.js hot module reloads in dev mode.
// Without this, each hot reload creates a fresh Map, causing 404s on status polls.
const g = global as typeof global & { __jobStore?: Map<string, Job> };
if (!g.__jobStore) g.__jobStore = new Map<string, Job>();
const store = g.__jobStore;

export function createJob(id: string, dishName: string, imagePath: string): Job {
  const job: Job = {
    id,
    status: "uploading",
    dishName,
    imagePath,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return store.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = store.get(id);
  if (!job) return undefined;
  const updated = { ...job, ...updates, updatedAt: Date.now() };
  store.set(id, updated);
  return updated;
}
