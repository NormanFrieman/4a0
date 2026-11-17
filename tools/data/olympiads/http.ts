/**
 * Polite JSON GET for the Wikimedia APIs: one request at a time, a short gap
 * between requests, `Retry-After` honoured on 429/503. The User-Agent names
 * the project repository as contact, as the Wikimedia User-Agent policy asks
 * (clients without a contact are throttled much harder).
 */
const USER_AGENT = "4a0-data-pipeline/0.1 (+https://github.com/NormanFrieman/4a0)";
const GAP_MS = 1000;
const MAX_TRIES = 10;

let last = 0;
let requests = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function requestCount(): number {
  return requests;
}

export async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    requests++;
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status === 503) && attempt < MAX_TRIES) {
      const retryAfter = Number(res.headers.get("retry-after")) || 5 * attempt;
      console.warn(`HTTP ${res.status}, retrying in ${retryAfter}s: ${url.slice(0, 120)}`);
      await sleep(retryAfter * 1000);
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
}
