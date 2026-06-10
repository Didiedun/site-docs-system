import { useEffect, useState } from 'react';
import { listCMGD, listArchivedDocs, cmgdStatus, type CMGDItem, type ArchivedDoc } from '../infrastructure/supabase/repositories';
import { useAuth } from './AuthProvider';
import { DocViewerModal } from './DocViewerModal';

const STATUS_COLOR: Record<string, string> = {
  overdue: '#b00020', due_soon: '#b45309', active: '#1a6e3c', issued: '#555',
};
const STATUS_BG: Record<string, string> = {
  overdue: '#fff0f0', due_soon: '#fffbeb', active: '#f8fffe', issued: '#f9fafb',
};
const STATUS_LABEL: Record<string, string> = {
  overdue: 'TAMAT TEMPOH', due_soon: 'HAMPIR TAMAT', active: 'AKTIF', issued: 'CMGD DIKELUARKAN',
};
const KIND_LABEL: Record<string, string> = { diary: 'Site Diary', memo: 'Memo', minit: 'Minit' };
const KIND_COLOR: Record<string, string> = { diary: '#7a0c2e', memo: '#1a4e8a', minit: '#1a6e3c' };

function daysUntil(dateStr: string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)} hari lepas`;
  if (d === 0) return 'Hari ini';
  return `${d} hari lagi`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const B = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
  return `${d.getDate()} ${B[d.getMonth()]} ${d.getFullYear()}`;
}

function StatCard({ label, value, color, urgent, sub }: { label: string; value: number; color: string; urgent?: boolean; sub?: string }) {
  const lit = urgent && value > 0;
  return (
    <div style={{ background: lit ? `${color}0f` : '#fff', border: `1px solid ${lit ? color + '44' : 'var(--line)'}`, borderLeft: `4px solid ${color}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 34, fontWeight: 800, color, fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: lit ? color : 'var(--ink)', marginTop: 6, lineHeight: 1.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function Dashboard({ onNavigate }: { onNavigate: (p: 'cmgd' | 'library' | 'studio') => void }) {
  const { user } = useAuth();
  const [cmgds, setCmgds] = useState<CMGDItem[]>([]);
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docKind, setDocKind] = useState<'all' | 'diary' | 'memo' | 'minit'>('all');
  const [viewing, setViewing] = useState<ArchivedDoc | null>(null);

  useEffect(() => {
    Promise.all([listCMGD(), listArchivedDocs()])
      .then(([c, d]) => { setCmgds(c); setDocs(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayName = (user?.user_metadata?.['full_name'] as string | undefined) ?? user?.email?.split('@')[0] ?? '';
  const now = new Date();
  const alertCmgds = cmgds.filter((c) => { const s = cmgdStatus(c); return s === 'overdue' || s === 'due_soon'; });
  const overdueCt = cmgds.filter((c) => cmgdStatus(c) === 'overdue').length;
  const dueSoonCt = cmgds.filter((c) => cmgdStatus(c) === 'due_soon').length;
  const activeCt = cmgds.filter((c) => cmgdStatus(c) === 'active').length;
  const filteredDocs = docKind === 'all' ? docs : docs.filter((d) => d.kind === docKind);

  return (
    <div style={{ width: '100%' }}>

      {/* Welcome banner — full width */}
      <div style={{ background: 'linear-gradient(135deg,var(--maroon),#9b1c3c)', borderRadius: 16, padding: '20px 26px', marginBottom: 22, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 3 }}>Selamat datang, {displayName}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{now.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        {overdueCt > 0 && (
          <div style={{ background: 'rgba(255,255,255,.18)', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {overdueCt} CMGD tamat tempoh — perlu tindakan
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 22, alignItems: 'start' }}>

        {/* LEFT — alerts + recent docs */}
        <div>
          {/* CMGD Alerts */}
          <SectionHead title="Peringatan CMGD" action="Urus semua" onAction={() => onNavigate('cmgd')} />
          {loading ? <Skeleton /> : alertCmgds.length === 0 ? (
            <EmptyBox line1="Tiada CMGD yang memerlukan tindakan segera." action="Lihat semua CMGD" onAction={() => onNavigate('cmgd')} />
          ) : (
            <div style={{ marginBottom: 28 }}>
              {alertCmgds.map((c) => {
                const s = cmgdStatus(c);
                return (
                  <div key={c.id} style={{ background: STATUS_BG[s], border: `1px solid ${STATUS_COLOR[s]}33`, borderLeft: `5px solid ${STATUS_COLOR[s]}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ background: STATUS_COLOR[s], padding: '5px 14px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>{STATUS_LABEL[s]}</span>
                      <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{daysUntil(c.dlp_end_date)}</span>
                    </div>
                    <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{c.project_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.contractor}{c.contract_no ? ` · ${c.contract_no}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, flexShrink: 0 }}>
                        <div style={{ color: 'var(--muted)' }}>Tamat DLP</div>
                        <div style={{ fontWeight: 700, color: STATUS_COLOR[s] }}>{fmtDate(c.dlp_end_date)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent docs */}
          <SectionHead title="Dokumen Terkini" action="Lihat arkib penuh" onAction={() => onNavigate('library')} />
          <div className="seg" style={{ marginBottom: 12 }}>
            {(['all', 'diary', 'memo', 'minit'] as const).map((k) => (
              <button key={k} className={docKind === k ? 'active' : ''} onClick={() => setDocKind(k)}>
                {k === 'all' ? `Semua (${docs.length})` : `${KIND_LABEL[k]} (${docs.filter(d => d.kind === k).length})`}
              </button>
            ))}
          </div>
          {loading ? <Skeleton /> : filteredDocs.length === 0 ? (
            <EmptyBox
              line1={docs.length === 0 ? 'Belum ada dokumen tersimpan.' : `Tiada dokumen jenis ${KIND_LABEL[docKind]}.`}
              line2={docs.length === 0 ? 'Jana dokumen dan klik "Simpan ke Sistem" dalam panel pratonton.' : undefined}
              action="Jana Dokumen Baru" onAction={() => onNavigate('studio')}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredDocs.slice(0, 8).map((d) => (
                <div key={d.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: (KIND_COLOR[d.kind] ?? '#888') + '15', border: `1px solid ${KIND_COLOR[d.kind] ?? '#888'}33` }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: KIND_COLOR[d.kind] ?? '#888', letterSpacing: '.04em', textAlign: 'center', lineHeight: 1.2 }}>
                      {(KIND_LABEL[d.kind] ?? d.kind).split(' ').map((w: string) => w[0]).join('')}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      {d.project_name && <span>{d.project_name} · </span>}
                      {d.created_at ? fmtDate(d.created_at.slice(0, 10)) : ''}
                    </div>
                  </div>
                  <button onClick={() => setViewing(d)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--maroon)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, padding: '4px 8px', borderRadius: 6 }}>Buka</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT sidebar — stats + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatCard label="Dokumen Tersimpan" value={docs.length} color="var(--maroon)"
            sub={docs.length ? `${docs.filter(d=>d.kind==='diary').length} Diary · ${docs.filter(d=>d.kind==='memo').length} Memo · ${docs.filter(d=>d.kind==='minit').length} Minit` : 'Belum ada dokumen'} />
          <StatCard label="CMGD Tamat Tempoh" value={overdueCt} color="#b00020" urgent sub={overdueCt ? 'Tindakan diperlukan segera' : 'Tiada isu'} />
          <StatCard label="CMGD Hampir Tamat" value={dueSoonCt} color="#b45309" urgent sub={dueSoonCt ? 'Dalam tempoh 30 hari' : 'Tiada isu'} />
          <StatCard label="CMGD Aktif" value={activeCt} color="#1a6e3c" sub="Dalam tempoh DLP" />

          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--ink)' }}>Tindakan Pantas</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => onNavigate('studio')} style={{ padding: '10px 14px', fontSize: 13, textAlign: 'left' }}>+ Jana Dokumen Baru</button>
              <button className="btn" onClick={() => onNavigate('cmgd')} style={{ padding: '10px 14px', fontSize: 13, textAlign: 'left' }}>Urus CMGD</button>
              <button className="btn" onClick={() => onNavigate('library')} style={{ padding: '10px 14px', fontSize: 13, textAlign: 'left' }}>Arkib Dokumen</button>
            </div>
          </div>
        </div>
      </div>

      {viewing && <DocViewerModal url={viewing.signed_url ?? viewing.public_url} htmlPath={viewing.html_path} title={viewing.title} onClose={() => setViewing(null)} />}
    </div>
  );
}

function SectionHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{title}</h3>
      <button onClick={onAction} style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{action} &rarr;</button>
    </div>
  );
}

function EmptyBox({ line1, line2, action, onAction }: { line1: string; line2?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 12, padding: '22px 18px', textAlign: 'center', marginBottom: 28 }}>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 4px' }}>{line1}</p>
      {line2 && <p style={{ color: 'var(--muted)', fontSize: 12, margin: '0 0 12px' }}>{line2}</p>}
      {action && onAction && <button className="btn" style={{ padding: '6px 16px', fontSize: 12 }} onClick={onAction}>{action}</button>}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
      {[1, 2].map((i) => <div key={i} style={{ height: 68, background: '#f0ece6', borderRadius: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
    </div>
  );
}
