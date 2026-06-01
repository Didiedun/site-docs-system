// Adapter: ProgrammeParser + LlmGateway via the Python service.
import { DocumentKind, ProgrammeSnapshot } from '../domain/entities';
import { LlmGateway, ProgrammeParser } from '../domain/ports';

// Free-tier backends sleep when idle; the first call can drop while it wakes.
// Retry network failures a few times before giving up.
async function fetchWithRetry(url: string, init: RequestInit, tries = 6, delayMs = 5000): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

export class BackendGateway implements ProgrammeParser, LlmGateway {
  constructor(private baseUrl: string) {}

  async parse(file: File): Promise<ProgrammeSnapshot> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetchWithRetry(`${this.baseUrl}/programme/parse`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`programme/parse failed: ${res.status}`);
    return res.json();
  }

  async generateBody(docType: DocumentKind, payload: Record<string, unknown>): Promise<string> {
    const res = await fetchWithRetry(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, payload }),
    });
    if (!res.ok) throw new Error(`generate failed: ${res.status}`);
    const data = await res.json();
    return data.body as string;
  }
}
