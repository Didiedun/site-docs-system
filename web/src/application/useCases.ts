import { GeneratedDocument, ProgrammeSnapshot } from '../domain/entities';
import { DiaryRenderer, DocumentRepository, LlmGateway, MemoRenderer, ProgrammeParser } from '../domain/ports';

export interface Ports {
  llm: LlmGateway;
  programme: ProgrammeParser;
  documents: DocumentRepository;
  diary: DiaryRenderer;
  memo: MemoRenderer;
}

// Persistence is optional: if saving to Supabase fails, still return the
// generated document so the UI shows it.
async function trySave(repo: DocumentRepository, doc: GeneratedDocument): Promise<GeneratedDocument> {
  try {
    return await repo.save(doc);
  } catch (e) {
    console.warn('Document not persisted (continuing):', e);
    return doc;
  }
}

// Strips any markdown code fence by keeping only the first {...} / [...] block.
function parseModelJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export function parseProgramme(ports: Ports, file: File): Promise<ProgrammeSnapshot> {
  return ports.programme.parse(file);
}

export async function generateMemo(
  ports: Ports,
  args: {
    projectId: string;
    memoType: string;
    siteStory: Record<string, unknown>;
    header?: Record<string, unknown>;
    snapshot?: ProgrammeSnapshot;
  },
): Promise<{ doc: GeneratedDocument; html: string }> {
  const payload = { memoType: args.memoType, ...args.siteStory, programme: args.snapshot ?? null };
  const bodyJson = await ports.llm.generateBody('memo', payload);
  const data = parseModelJson(bodyJson);
  const html = ports.memo.render({ ...(args.header || {}), blok: data.blok, penutup: data.penutup });
  const doc = await trySave(ports.documents, { projectId: args.projectId, kind: 'memo', memoType: args.memoType, body: bodyJson });
  return { doc, html };
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
  args: {
    projectId: string;
    notes: Record<string, unknown>;
    header?: { tajuk?: string; bil?: string; tarikh?: string; hari?: string };
    lb?: { entries: { catatan: string; photos: { name: string; dataUrl: string }[] }[]; disiplin?: string; tajukLajur?: string };
    snapshot?: ProgrammeSnapshot;
  },
): Promise<{ doc: GeneratedDocument; html: string }> {
  const bodyJson = await ports.llm.generateBody('diary', args.notes);
  const data = parseModelJson(bodyJson);
  if (args.lb && args.lb.entries.length) {
    data.photoEntries = args.lb.entries;
    data.lbDisiplin = args.lb.disiplin;
    data.lbTajukLajur = args.lb.tajukLajur;
  }
  if (args.header?.tajuk) data.tajuk = args.header.tajuk;
  if (args.header?.bil) data.bil = args.header.bil;
  if (args.header?.tarikh) data.tarikh = args.header.tarikh;
  if (args.header?.hari) data.hari = args.header.hari;
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
