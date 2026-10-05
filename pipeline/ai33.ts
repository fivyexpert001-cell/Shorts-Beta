// Minimal ai33.pro (OpenSpeaker) API client.
// Auth: header `xi-api-key: <AI33PRO_API_KEY>`. Base: https://api.ai33.pro
// Everything is an async task: create -> poll /v1/task/{id}/full -> read metadata.
// Full API notes: docs/ai33pro-api.md
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const BASE = process.env.AI33PRO_BASE_URL ?? "https://api.ai33.pro";

function apiKey(): string {
  const k = process.env.AI33PRO_API_KEY;
  if (!k) throw new Error("AI33PRO_API_KEY is not set — add it to .env");
  return k;
}

type ReqOpts = { headers?: Record<string, string>; body?: BodyInit };

async function req<T = any>(method: string, path: string, opts: ReqOpts = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "xi-api-key": apiKey(), ...(opts.headers ?? {}) },
    body: opts.body,
  });
  const raw = await res.text();
  let parsed: any = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* non-JSON response; keep raw */
  }
  if (!res.ok) {
    const msg = parsed?.message ?? raw.slice(0, 300);
    throw new Error(`ai33 ${method} ${path} -> ${res.status}: ${msg}`);
  }
  return parsed as T;
}

export const getJSON = <T = any>(path: string) => req<T>("GET", path);
export const postJSON = <T = any>(path: string, data: unknown) =>
  req<T>("POST", path, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const postForm = <T = any>(path: string, form: FormData) =>
  req<T>("POST", path, { body: form });

/** Append a local file to a multipart form as a named field. */
export async function appendFile(form: FormData, field: string, filePath: string) {
  const buf = await readFile(filePath);
  form.append(field, new Blob([new Uint8Array(buf)]), basename(filePath));
}

export interface Task {
  id: string;
  status: "doing" | "done" | "error" | string;
  progress?: number;
  type?: string;
  error_message?: string | null;
  metadata?: Record<string, any>;
}

/** Extract a task id from a create-task response (field name varies). */
export function taskIdOf(resp: any): string {
  const id = resp?.task_id ?? resp?.id ?? resp?.data?.task_id ?? resp?.data?.id;
  if (!id) throw new Error(`no task id in response: ${JSON.stringify(resp).slice(0, 200)}`);
  return String(id);
}

/** Poll until the task is done (or throws on error/timeout). */
export async function waitForTask(
  taskId: string,
  { pollMs = 3000, timeoutMs = 600_000 }: { pollMs?: number; timeoutMs?: number } = {}
): Promise<Task> {
  const start = Date.now();
  for (;;) {
    const t = await getJSON<Task>(`/v1/task/${taskId}/full`);
    if (t.status === "done") return t;
    if (t.status === "error") {
      throw new Error(`task ${taskId} failed: ${t.error_message ?? "unknown error"}`);
    }
    if (Date.now() - start > timeoutMs) throw new Error(`task ${taskId} timed out`);
    process.stdout.write(`  …${t.status} ${t.progress ?? 0}%   \r`);
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/** Remaining credit balance. */
export async function credits(): Promise<number> {
  const r = await getJSON("/v1/credits");
  return r.credits ?? r.data?.credits ?? NaN;
}

/** Download a (public CDN) URL to a local path. */
export async function download(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
