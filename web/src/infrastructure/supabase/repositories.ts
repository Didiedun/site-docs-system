import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeneratedDocument, Project } from '../../domain/entities';
import type { DocumentRepository, ProjectRepository } from '../../domain/ports';
import { supabase } from './client';

export { supabase };

export function makeSupabase(_url: string, _key: string): SupabaseClient {
  return supabase;
}

/** Thrown when the user's auth session is missing or expired (auth/v1/user
 *  returns 403). Callers can show a "please log in again" message instead of a
 *  cryptic Storage/RLS failure. */
export class SessionExpiredError extends Error {
  constructor(message = 'Sesi tamat — sila log masuk semula untuk menyimpan.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/** Returns the current authenticated user id, or throws SessionExpiredError.
 *  Replaces the previous silent `?? 'shared'` fallback that built an upload
 *  path Storage RLS always rejects, surfacing as a confusing 400 on save. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new SessionExpiredError();
  return data.user.id;
}

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private db: SupabaseClient) {}
  async get(id: string): Promise<Project | null> {
    const { data, error } = await this.db.from('projects').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Project) ?? null;
  }
  async save(project: Project): Promise<Project> {
    const { data, error } = await this.db.from('projects').upsert(project).select().single();
    if (error) throw error;
    return data as Project;
  }
}

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private db: SupabaseClient) {}
  async save(doc: GeneratedDocument): Promise<GeneratedDocument> {
    const { data, error } = await this.db.from('documents').insert(doc).select().single();
    if (error) throw error;
    return data as GeneratedDocument;
  }
  async listByProject(projectId: string): Promise<GeneratedDocument[]> {
    const { data, error } = await this.db
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as GeneratedDocument[]) ?? [];
  }
}

// ─── CMGD ────────────────────────────────────────────────────────────────────

export interface CMGDItem {
  id?: string;
  project_name: string;
  contractor: string;
  contract_no?: string;
  practical_completion_date: string;
  dlp_months: number;
  dlp_end_date: string;
  cmgd_issued_date?: string | null;
  notes?: string;
  user_id?: string;
  created_at?: string;
}

export type CMGDStatus = 'active' | 'due_soon' | 'overdue' | 'issued';

export function cmgdStatus(item: CMGDItem): CMGDStatus {
  if (item.cmgd_issued_date) return 'issued';
  const today = new Date();
  const end = new Date(item.dlp_end_date);
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  return 'active';
}

export async function listCMGD(): Promise<CMGDItem[]> {
  const { data, error } = await supabase
    .from('cmgd_items')
    .select('*')
    .order('dlp_end_date', { ascending: true });
  if (error) throw error;
  return (data as CMGDItem[]) ?? [];
}

export async function saveCMGD(item: CMGDItem): Promise<CMGDItem> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const payload = { ...item, user_id: userId };
  if (item.id) {
    const { data, error } = await supabase.from('cmgd_items').update(payload).eq('id', item.id).select().single();
    if (error) throw error;
    return data as CMGDItem;
  }
  const { data, error } = await supabase.from('cmgd_items').insert(payload).select().single();
  if (error) throw error;
  return data as CMGDItem;
}

export async function deleteCMGD(id: string): Promise<void> {
  const { error } = await supabase.from('cmgd_items').delete().eq('id', id);
  if (error) throw error;
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export interface MeetingRecord {
  id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  meet_link?: string;
  calendar_event_id?: string;
  attendees?: string[];
  user_id?: string;
  created_at?: string;
}

export async function listMeetings(): Promise<MeetingRecord[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data as MeetingRecord[]) ?? [];
}

export async function saveMeeting(m: MeetingRecord): Promise<MeetingRecord> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const payload = { ...m, user_id: userId };
  if (m.id) {
    const { data, error } = await supabase.from('meetings').update(payload).eq('id', m.id).select().single();
    if (error) throw error;
    return data as MeetingRecord;
  }
  const { data, error } = await supabase.from('meetings').insert(payload).select().single();
  if (error) throw error;
  return data as MeetingRecord;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw error;
}

// ─── Saved Documents (Archive) ───────────────────────────────────────────────

export interface ArchivedDoc {
  id?: string;
  title: string;
  kind: string;
  html_path: string;
  public_url: string;
  signed_url?: string;                        // generated at read time, never stored in DB
  project_name?: string;
  source_payload?: Record<string, unknown>;   // raw notes + key fields, stored for audit
  user_id?: string;
  created_at?: string;
}

export async function listArchivedDocs(): Promise<ArchivedDoc[]> {
  const { data, error } = await supabase
    .from('archived_docs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const docs = (data as ArchivedDoc[]) ?? [];
  if (!docs.length) return docs;

  // Generate short-lived signed URLs (1 h) so the bucket can stay private
  const { data: signed } = await supabase.storage
    .from('documents')
    .createSignedUrls(docs.map((d) => d.html_path), 3600);

  if (signed) {
    const urlMap = new Map(signed.map((s) => [s.path, s.signedUrl]));
    return docs.map((d) => ({ ...d, signed_url: urlMap.get(d.html_path) ?? undefined }));
  }
  return docs;
}

export async function saveArchivedDoc(doc: ArchivedDoc): Promise<ArchivedDoc> {
  const userId = await requireUserId();
  const { signed_url: _s, source_payload, ...base } = doc;
  void _s;
  const payload = { ...base, user_id: userId };

  // Try with source_payload (requires migration 002). If the column doesn't
  // exist yet, fall back to saving without it so other accounts aren't blocked.
  if (source_payload !== undefined) {
    const { data, error } = await supabase
      .from('archived_docs')
      .insert({ ...payload, source_payload })
      .select()
      .single();
    if (!error) return data as ArchivedDoc;
    if (!error.message?.includes('source_payload')) throw error;
    // column not yet added — fall through and save without it
  }

  const { data, error } = await supabase.from('archived_docs').insert(payload).select().single();
  if (error) throw error;
  return data as ArchivedDoc;
}

export async function getSignedDocUrl(htmlPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(htmlPath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteArchivedDoc(id: string, htmlPath: string): Promise<void> {
  await supabase.storage.from('documents').remove([htmlPath]);
  const { error } = await supabase.from('archived_docs').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDocumentHTML(html: string, pathSuffix: string): Promise<{ publicUrl: string; fullPath: string }> {
  return uploadDocumentFile(new Blob([html], { type: 'text/html' }), pathSuffix, 'text/html');
}

export async function uploadDocumentFile(blob: Blob, pathSuffix: string, contentType: string): Promise<{ publicUrl: string; fullPath: string }> {
  const userId = await requireUserId();
  const fullPath = `${userId}/${pathSuffix}`;
  const { error } = await supabase.storage.from('documents').upload(fullPath, blob, { upsert: true, contentType });
  if (error) throw error;
  const { data } = supabase.storage.from('documents').getPublicUrl(fullPath);
  return { publicUrl: data.publicUrl, fullPath };
}
