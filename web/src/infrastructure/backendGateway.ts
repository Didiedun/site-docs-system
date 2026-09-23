// Adapter: ProgrammeParser + LlmGateway via the authenticated Python service.
import { DocumentKind, ProgrammeSnapshot } from "../domain/entities";
import { LlmGateway, ProgrammeParser } from "../domain/ports";
import { supabase } from "./supabase/client";

export class AccessError extends Error {
  name = "AccessError";
}

async function authorization(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new AccessError(
      "Sesi tamat. Sila log masuk semula dengan akaun Google UTM anda.",
    );
  return `Bearer ${data.session.access_token}`;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  // Bound the wait. Do not automatically replay a POST after a lost response:
  // the server may already have generated (and billed for) the document.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    let response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { ...init.headers, Authorization: await authorization() },
    });
    if (response.status === 401 || response.status === 403) {
      // One refresh upgrades pre-hook tokens and handles expired sessions.
      const { error } = await supabase.auth.refreshSession();
      if (!error)
        response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: { ...init.headers, Authorization: await authorization() },
        });
    }
    if (response.status === 401 || response.status === 403)
      throw new AccessError(
        "Akses memerlukan akaun Google UTM @utm.my. Sila log masuk semula.",
      );
    if (!response.ok)
      throw new Error(
        "Pelayan tidak dapat memproses permintaan. Sila cuba lagi.",
      );
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export class BackendGateway implements ProgrammeParser, LlmGateway {
  constructor(private baseUrl: string) {}
  async parse(file: File): Promise<ProgrammeSnapshot> {
    const body = new FormData();
    body.append("file", file);
    const res = await request(`${this.baseUrl}/programme/parse`, {
      method: "POST",
      body,
    });
    return res.json();
  }
  async generateBody(
    docType: DocumentKind,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const res = await request(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docType, payload }),
    });
    const data = await res.json();
    return data.body as string;
  }
}
