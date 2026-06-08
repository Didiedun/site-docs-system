import { Ports } from './application/useCases';
import { BackendGateway } from './infrastructure/backendGateway';
import { renderDiary } from './infrastructure/render/diaryTemplate';
import { renderMemo } from './infrastructure/render/memoTemplate';
import { renderMinit, MinitData } from './infrastructure/render/minitTemplate';
import { supabase, SupabaseDocumentRepository } from './infrastructure/supabase/repositories';

export function buildPorts(): Ports {
  const gateway = new BackendGateway(import.meta.env.VITE_BACKEND_URL as string);
  return {
    llm: gateway,
    programme: gateway,
    documents: new SupabaseDocumentRepository(supabase),
    diary: { render: renderDiary },
    memo: { render: renderMemo },
    minit: { render: (d) => renderMinit(d as unknown as MinitData) },
  };
}
