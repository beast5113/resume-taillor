/** Talks to the Resume Tailor browser extension (assistant/app-connector.js)
    via window.postMessage. When the extension is installed, job links are
    opened by the extension so each tab is tied to its application seq and
    gets jobId + resumeContext in its sessionStorage. Without the extension,
    everything falls back to plain window.open. */

const APP_SOURCE = "resume-tailor-app";
const EXT_SOURCE = "rta-extension";

type ExtensionResult = { ok?: boolean; error?: string; [key: string]: unknown };

export interface JobToOpen { seq: number; url: string }

let ready = false;
let listeners = 0;
let nextRequestId = 0;
const waiting = new Map<string, (result: ExtensionResult) => void>();

function onMessage(event: MessageEvent) {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== EXT_SOURCE || typeof data.requestId !== "string") return;
  const resolve = waiting.get(data.requestId);
  if (!resolve) return;
  waiting.delete(data.requestId);
  resolve(data);
}

function request(type: string, body: Record<string, unknown>, timeoutMs: number): Promise<ExtensionResult | null> {
  const requestId = `rt-${Date.now()}-${++nextRequestId}`;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      waiting.delete(requestId);
      resolve(null);
    }, timeoutMs);
    waiting.set(requestId, (result) => {
      window.clearTimeout(timer);
      resolve(result);
    });
    window.postMessage({ ...body, source: APP_SOURCE, type, requestId }, window.location.origin);
  });
}

/** Starts listening and checks whether the extension is present. Returns a cleanup for useEffect. */
export function initExtensionBridge(): () => void {
  if (listeners++ === 0) window.addEventListener("message", onMessage);
  void request("RTA_PING", {}, 1500).then((result) => { ready = !!result?.ok; });
  return () => {
    if (--listeners === 0) window.removeEventListener("message", onMessage);
  };
}

export function isExtensionReady(): boolean {
  return ready;
}

/** Opens the jobs as extension-tracked tabs, then sends each application's
    context. Resolves false if the extension didn't open them. */
async function openWithExtension(jobs: JobToOpen[], active?: boolean): Promise<boolean> {
  const opened = await request("RTA_OPEN_JOBS", { jobs, active }, 3000);
  if (!opened?.ok) return false;

  void Promise.all(jobs.map(async ({ seq }) => {
    try {
      const res = await fetch(`/api/applications/by-seq/${seq}`);
      if (!res.ok) return;
      const record = await res.json();
      await request("RTA_JOB_CONTEXT", { seq, record }, 5000);
    } catch { /* extension falls back to fetching it on first use */ }
  }));
  return true;
}

function openInBrowser(jobs: JobToOpen[]) {
  jobs.forEach((job) => window.open(job.url, "_blank", "noopener,noreferrer"));
}

/** Opens job links — through the extension when it's installed, otherwise as plain tabs.
    `active` focuses the first new tab; omitted, only a single job is focused.
    Returns a promise so callers can show a loading state for the (up to a few
    seconds) extension round-trip instead of leaving the click looking inert. */
export async function openJobLinks(jobs: JobToOpen[], active?: boolean): Promise<void> {
  if (!jobs.length) return;
  if (!ready) {
    openInBrowser(jobs);
    return;
  }
  const ok = await openWithExtension(jobs, active);
  if (!ok) openInBrowser(jobs);
}
