import { GeneratedDocument, ProgrammeSnapshot } from '../domain/entities';
import { DiaryRenderer, DocumentRepository, LlmGateway, ProgrammeParser } from '../domain/ports';

export interface Ports {
  llm: LlmGateway;
  programme: ProgrammeParser;
  documents: DocumentRepository;
  diary: DiaryRenderer;
}

// Persistence is optional: if saving to Supabase fails (tables/policies/project
// row not set up yet), still return the generated document so the UI shows it.
async function trySave(repo: DocumentRepository, doc: GeneratedDocument): Promise<GeneratedDocument> {
  try {
    return await repo.save(doc);
  } catch (e) {
    console.warn('Document not persisted (continuing):', e);
    return doc;
  }
}

export function parseProgramme(ports: Ports, file: File): Promise<ProgrammeSnapshot> {
  return ports.programme.parse(file);
}

export async function generateMemo(
  ports: Ports,
  args: { projectId: string; memoType: string; siteStory: Record<string, unknown>; snapshot?: ProgrammeSnapshot },
): Promise<GeneratedDocument> {
  const payload = { memoType: args.memoType, ...args.siteStory, programme: args.snapshot ?? null };
  const body = await ports.llm.generateBody('memo', payload);
  return trySave(ports.documents, { projectId: args.projectId, kind: 'memo', memoType: args.memoType, body });
}

export async function generateMinit(
  ports: Ports,
  args: { projectId: string; points: Record<string, unknown> },
): Promise<GeneratedDocument> {
  const body = await ports.llm.generateBody('minit', args.points);
  return trySave(ports.documents, { projectId: args.projectId, kind: 'minit', body });
}

export async function generateSiteDiary(
  ports: Ports,
  args: { projectId: string; notes: Record<string, unknown>; snapshot?: ProgrammeSnapshot },
): Promise<{ doc: GeneratedDocument; html: string }> {
  const bodyJson = await ports.llm.generateBody('diary', args.notes);
  const fenced = bodyJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const data = JSON.parse(fenced ? fenced[1] : bodyJson) as Record<string, unknown>;
  if (args.snapshot) {
    data.status = {
      rancang: String(args.snapshot.overall.plan ?? ''),
      sebenar: String(args.snapshot.overall.actual ?? ''),
    };
  }
  const html = ports.diary.render(data);
  const doc = await trySave(ports.documents, { projectId: args.projectId, kind: 'diary', body: bodyJson });
  return { doc, html };
}
