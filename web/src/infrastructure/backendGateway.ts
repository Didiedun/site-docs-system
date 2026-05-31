// Adapter: fulfils ProgrammeParser + LlmGateway by calling the Python service
// (the .mpp parser must run server-side because MPXJ needs a JVM, and the
// Claude key must never reach the browser).
import { DocumentKind, ProgrammeSnapshot } from '../domain/entities';
import { LlmGateway, ProgrammeParser } from '../domain/ports';

export class BackendGateway implements ProgrammeParser, LlmGateway {
  constructor(private baseUrl: string) {}

  async parse(file: File): Promise<ProgrammeSnapshot> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${this.baseUrl}/programme/parse`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`programme/parse failed: ${res.status}`);
    return res.json();
  }

  async generateBody(docType: DocumentKind, payload: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, payload }),
    });
    if (!res.ok) throw new Error(`generate failed: ${res.status}`);
    const data = await res.json();
    return data.body as string;
  }
}
