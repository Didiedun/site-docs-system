import { useEffect, useState } from 'react';
import { listCMGD, listArchivedDocs, cmgdStatus, type CMGDItem, type ArchivedDoc } from '../infrastructure/supabase/repositories';
import { useAuth } from './AuthProvider';
import { DocViewerModal } from './DocViewerModal';

const STATUS_COLOR: Record<string, string> = {
  overdue: '#b00020',
  due_soon: '#b45309',
  active: '#1a6e3c',
  issued: '#555',
};
const STATUS_BG: Record<string, string> = {
  overdue: '#fdecec',
  due_soon: '#fef3c7',
  active: '#ecfdf5',
  issued: '#f3f4f6',
};
const STATUS_LABEL: Record<string, string> = {
  overdue: 'TAMAT TEMPOH',
  due_soon: 'HAMPIR TAMAT',
  active: 'AKTIF',
  issued: 'CMGD DIKELUARKAN',
};
const KIND_LABEL: Record<string, string> = { diary: 'Site Diary', memo: 'Memo', minit: 'Minit' };

function daysUntil(dateStr: string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)} hari lepas`;
  if (d === 0) return 'Hari ini';
  return `${d} hari lagi`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
  </div>
);

export function Dashboard({ onNavigate }: { onNavigate: (p: 'cmgd' | 'library' | 'studio') => void }) {
  const { user } = useAuth();
  const [cmgds, setCmgds] = useState<CMGDItem[]>([]);
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCMGD(), listArchivedDocs()])
      .then(([c, d]) => { setCmgds(c); setDocs(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [docKind, setDocKind] = useState<'all' | 'diary' | 'memo' | 'minit'>('all');
  const [viewing, setViewing] = useState<ArchivedDoc | null>(null);

  const firstName = (user?.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0] ?? 'Selamat datang';
  const now = new Date();
  const alertCmgds = cmgds.filter((c) => { const s = cmgdStatus(c); return s === 'overdue' || s === 'due_soon'; });
  const overdueCt = cmgds.filter((c) => cmgdStatus(c) === 'overdue').length;
  const dueSoonCt = cmgds.filter((c) => cmgdStatus(c) === 'due_soon').length;
  const filteredDocs = docKind === 'all' ? docs : docs.filter((d) => d.kind === docKind);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, margin: '0 0 4px', color: 'var(--maroon)' }}>Selamat datang, {firstName}</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
          {now.toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatCard label="Dokumen Tersimpan" value={docs.length} color="var(--maroon)" />
        <StatCard label="CMGD Tamat Tempoh" value={overdueCt} color="#b00020" />
        <StatCard label="CMGD Hampir Tamat" value={dueSoonCt} color="#b45309" />
      </div>

      {/* CMGD Alerts */}
      <Section title="Peringatan CMGD" action="Lihat semua CMGD" onAction={() => onNavigate('cmgd')}>
        {loading ? (
          <Skeleton />
        ) : alertCmgds.length === 0 ? (
          <Empty text="Tiada CMGD yang memerlukan tindakan segera." />
        ) : (
          alertCmgds.map((c) => {
            const s = cmgdStatus(c);
            return (
              <div key={c.id} style={{ background: STATUS_BG[s], border: `1px solid ${STATUS_COLOR[s]}33`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <span style={{ display: 'inline-block', background: STATUS_COLOR[s], color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 7px', marginBottom: 6 }}>
                      {STATUS_LABEL[s]}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.project_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.contractor} · {c.contract_no}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: STATUS_COLOR[s], fontSize: 13 }}>{daysUntil(c.dlp_end_date)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Tamat DLP: {fmtDate(c.dlp_end_date)}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Section>

      {/* Recent documents */}
      <Section title="Dokumen Terkini" action="Lihat arkib" onAction={() => onNavigate('library')}>
        <div className="seg" style={{ marginBottom: 12 }}>
          {(['all', 'diary', 'memo', 'minit'] as const).map((k) => (
            <button key={k} className={docKind === k ? 'active' : ''} onClick={() => setDocKind(k)}>
              {k === 'all' ? `Semua (${docs.length})` : `${KIND_LABEL[k]} (${docs.filter(d => d.kind === k).length})`}
            </button>
          ))}
        </div>
        {loading ? <Skeleton /> : filteredDocs.length === 0 ? (
          <Empty text={docs.length === 0 ? 'Tiada dokumen tersimpan. Jana dokumen dan simpan ke sistem.' : `Tiada dokumen jenis ${KIND_LABEL[docKind]}.`} />
        ) : (
          filteredDocs.slice(0, 5).map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--maroon)', letterSpacing: '.03em' }}>{KIND_LABEL[d.kind] ?? d.kind}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{d.project_name} · {d.created_at ? fmtDate(d.created_at.slice(0, 10)) : ''}</div>
              </div>
              <button onClick={() => setViewing(d)} style={{ background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', fontSize: 12, color: 'var(--maroon)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, padding: 0 }}>Buka</button>
            </div>
          ))
        )}
      </Section>

      {/* Quick action */}
      <div style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={() => onNavigate('studio')} style={{ padding: '12px 24px', fontSize: 14 }}>
          + Jana Dokumen Baru
        </button>
      </div>

      {viewing && (
        <DocViewerModal
          url={viewing.public_url}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

function Section({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, margin: 0, color: 'var(--ink)' }}>{title}</h3>
        <button onClick={onAction} style={{ background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', color: 'var(--maroon)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{action} &rarr;</button>
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0, padding: '10px 0' }}>{text}</p>;
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2].map((i) => (
        <div key={i} style={{ height: 64, background: '#f0ece6', borderRadius: 10, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
