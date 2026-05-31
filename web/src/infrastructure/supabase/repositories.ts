import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GeneratedDocument, Project } from '../../domain/entities';
import { DocumentRepository, ProjectRepository } from '../../domain/ports';

export function makeSupabase(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey);
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
    const { data, error } = await this.db.from('documents')
      .select('*').eq('projectId', projectId).order('createdAt', { ascending: false });
    if (error) throw error;
    return (data as GeneratedDocument[]) ?? [];
  }
}
