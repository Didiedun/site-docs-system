// Boundaries the application layer depends on. Implemented by infrastructure.
import { DocumentKind, GeneratedDocument, ProgrammeSnapshot, Project } from './entities';
 
export interface ProgrammeParser {
  parse(file: File): Promise<ProgrammeSnapshot>;
}
 
export interface LlmGateway {
  generateBody(docType: DocumentKind, payload: Record<string, unknown>): Promise<string>;
}
 
export interface ProjectRepository {
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<Project>;
}
 
export interface DocumentRepository {
  save(doc: GeneratedDocument): Promise<GeneratedDocument>;
  listByProject(projectId: string): Promise<GeneratedDocument[]>;
}
 
export interface DiaryRenderer {
  render(data: Record<string, unknown>): string; // -> print-ready HTML
}
 
export interface MemoRenderer {
  render(data: Record<string, unknown>): string;
}
 