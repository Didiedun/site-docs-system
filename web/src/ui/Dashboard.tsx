import { useEffect, useState } from 'react';
import { listCMGD, listMeetings, listArchivedDocs, cmgdStatus, type CMGDItem, type MeetingRecord, type ArchivedDoc } from '../infrastructure/supabase/repositories';
import { useAuth } from './AuthProvider';

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

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
}

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
  </div>
);

export function Dashboard({ onNavigate }: { onNavigate: (p: 'cmgd' | 'meetings' | 'library' | 'studio') => void }) {
  const { user } = useAuth();
  const [cmgds, setCmgds] = useState<CMGDItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCMGD(), listMeetings(), listArchivedDocs()])
      .then(([c, m, d]) => { setCmgds(c); setMeetings(m); setDocs(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const firstName = (user?.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0] ?? 'Selamat datang';
  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.start_time) >= now).slice(0, 3);
  const alertCmgds = cmgds.filter((c) => { const s = cmgdStatus(c); return s === 'overdue' || s === 'due_soon'; });
  const overdueCt = cmgds.filter((c) => cmgdStatus(c) === 'overdue').length;
  const dueSoonCt = cmgds.filter((c) => cmgdStatus(c) === 'due_soon').length;

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
        <StatCard label="Mesyuarat Akan Datang" value={upcoming.length} color="#1a6e3c" />
      </div>

      {/* CMGD Alerts */}
      <Section title="🔔 Peringatan CMGD" action="Lihat semua CMGD" onAction={() => onNavigate('cmgd')}>
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

      {/* Upcoming meetings */}
      <Section title="📅 Mesyuarat Akan Datang" action="Lihat semua" onAction={() => onNavigate('meetings')}>
        {loading ? <Skeleton /> : upcoming.length === 0 ? (
          <Empty text="Tiada mesyuarat dijadualkan." />
        ) : (
          upcoming.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, background: 'rgba(122,12,46,.08)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{fmtDateTime(m.start_time)}</div>
              </div>
              {m.meet_link && (
                <a href={m.meet_link} target="_blank" rel="noreferrer" style={{ background: '#1a73e8', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  Join Meet
                </a>
              )}
            </div>
          ))
        )}
      </Section>

      {/* Recent documents */}
      <Section title="📂 Dokumen Terkini" action="Lihat arkib" onAction={() => onNavigate('library')}>
        {loading ? <Skeleton /> : docs.length === 0 ? (
          <Empty text="Tiada dokumen tersimpan. Jana dokumen dan simpan ke sistem." />
        ) : (
          docs.slice(0, 5).map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{d.kind === 'diary' ? '📓' : d.kind === 'memo' ? '📄' : '📋'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{d.project_name} · {d.created_at ? fmtDate(d.created_at.slice(0, 10)) : ''}</div>
              </div>
              <a href={d.public_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>Buka</a>
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
    </div>
  );
}

function Section({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, margin: 0, color: 'var(--ink)' }}>{title}</h3>
        <button onClick={onAction} style={{ background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', color: 'var(--maroon)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{action} →</button>
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
