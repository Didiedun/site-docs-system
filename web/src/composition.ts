// Composition root: the ONLY place adapters are wired to the use-case ports.
import { Ports } from './application/useCases';
import { BackendGateway } from './infrastructure/backendGateway';
import { renderDiary } from './infrastructure/render/diaryTemplate';
import { renderMemo } from './infrastructure/render/memoTemplate';
import { renderMinit, MinitData } from './infrastructure/render/minitTemplate';
import { makeSupabase, SupabaseDocumentRepository } from './infrastructure/supabase/repositories';

export function buildPorts(): Ports {
  const gateway = new BackendGateway(import.meta.env.VITE_BACKEND_URL as string);
  const db = makeSupabase(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  );
  return {
    llm: gateway,
    programme: gateway,
    documents: new SupabaseDocumentRepository(db),
    diary: { render: renderDiary },
    memo: { render: renderMemo },
    minit: { render: (d) => renderMinit(d as unknown as MinitData) },
  };
}