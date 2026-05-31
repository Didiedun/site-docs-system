import { GeneratedDocument, ProgrammeSnapshot } from '../domain/entities';
import { DiaryRenderer, DocumentRepository, LlmGateway, ProgrammeParser } from '../domain/ports';

export interface Ports {
  llm: LlmGateway;
  programme: ProgrammeParser;
  documents: DocumentRepository;
  diary: DiaryRenderer;
}

/** Parse the .mpp into a progress snapshot (numbers + variances + status lists). */
export function parseProgramme(ports: Ports, file: File): Promise<ProgrammeSnapshot> {
  return ports.programme.parse(file);
}

/** Memo: type + site story (+ snapshot when kelewatan) -> generated body. */
export async function generateMemo(
  ports: Ports,
  args: { projectId: string; memoType: string; siteStory: Record<string, unknown>; snapshot?: ProgrammeSnapshot },
): Promise<GeneratedDocument> {
  const payload = { memoType: args.memoType, ...args.siteStory, programme: args.snapshot ?? null };
  const body = await ports.llm.generateBody('memo', payload);
  return ports.documents.save({ projectId: args.projectId, kind: 'memo', memoType: args.memoType, body });
}

/** Minit: raw meeting points -> generated body sections. */
export async function generateMinit(
  ports: Ports,
  args: { projectId: string; points: Record<string, unknown> },
): Promise<GeneratedDocument> {
  const body = await ports.llm.generateBody('minit', args.points);
  return ports.documents.save({ projectId: args.projectId, kind: 'minit', body });
}

/** Site diary: day notes -> narrative; status filled from the snapshot; rendered to HTML. */
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

  const doc = await ports.documents.save({ projectId: args.projectId, kind: 'diary', body: bodyJson });
  return { doc, html };
}
