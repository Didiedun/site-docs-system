export type DocumentKind = 'memo' | 'minit' | 'diary';

export interface Project {
  id: string;
  tajuk: string;          // project title (fixed, reused on every document)
  contractor: string;     // e.g. "UER Ventures Sdn Bhd"
  contractNo: string;     // No. Sebutharga
  startDate: string;
  finishDate: string;
  attendees: string[];    // standing meeting attendees (for minit)
  signatories: { prepared?: string; checked?: string; approved?: string };
}

export interface ProgrammeBlock {
  label: string;
  plan: number | null;
  actual: number | null;
  variance: number | null;
}

export interface ProgrammeSnapshot {
  statusDate: string | null;
  startDate: string | null;
  finishDate: string | null;
  overall: { plan: number | null; actual: number | null; variance: number | null };
  blocks: ProgrammeBlock[];
  notStarted: string[];
  inProgress: string[];
  complete: string[];
}

export interface GeneratedDocument {
  id?: string;
  projectId: string;
  kind: DocumentKind;
  memoType?: string;   // present when kind === 'memo'
  body: string;        // generated body (markdown) or diary narrative JSON
  createdAt?: string;
}
