import { useEffect, useState } from 'react';
import { listArchivedDocs, deleteArchivedDoc, type ArchivedDoc } from '../infrastructure/supabase/repositories';
import { DocViewerModal } from './DocViewerModal';

const KIND_LABEL: Record<string, string> = { diary: 'Site Diary', memo: 'Memo', minit: 'Minit Mesyuarat' };
const KIND_COLOR: Record<string, string> = { diary: '#7a0c2e', memo: '#1a4e8a', minit: '#1a6e3c' };
const KIND_BG: Record<string, string> = { diary: '#fdf0f3', memo: '#eef3fc', minit: '#f0faf4' };

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function DocumentLibrary({ onCreateNew }: { onCreateNew: () => void }) {
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'diary' | 'memo' | 'minit'>('all');
  const [viewing, setViewing] = useState<ArchivedDoc | null>(null);

  async function reload() {
    setLoading(true);
    try { setDocs(await listArchivedDocs()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  async function handleDelete(doc: ArchivedDoc) {
    if (!confirm(`Padam "${doc.title}"?`)) return;
    try { await deleteArchivedDoc(doc.id!, doc.html_path); await reload(); }
    catch (e) { setError(String(e)); }
  }

  const filtered = docs.filter((d) => {
    const matchKind = kindFilter === 'all' || d.kind === kindFilter;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || (d.project_name ?? '').toLowerCase().includes(search.toLowerCase());
    return matchKind && matchSearch;
  });

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, margin: '0 0 3px', color: 'var(--maroon)' }}>Arkib Dokumen</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Dokumen yang telah dijana dan disimpan ke sistem.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateNew}>+ Jana Dokumen Baru</button>
      </div>

      {/* Kind summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {(['diary', 'memo', 'minit'] as const).map((k) => {
          const ct = docs.filter(d => d.kind === k).length;
          return (
            <button key={k} onClick={() => setKindFilter(kindFilter === k ? 'all' : k)}
              style={{ background: kindFilter === k ? KIND_COLOR[k] : '#fff', border: `1px solid ${kindFilter === k ? KIND_COLOR[k] : 'var(--line)'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: kindFilter === k ? '#fff' : KIND_COLOR[k], fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>{ct}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: kindFilter === k ? 'rgba(255,255,255,.9)' : 'var(--ink)', marginTop: 6 }}>{KIND_LABEL[k]}</div>
            </button>
          );
        })}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Cari mengikut tajuk atau projek…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '9px 13px', border: '1px solid var(--line)', borderRadius: 10, font: 'inherit', fontSize: 13.5 }}
        />
        <div className="seg">
          {(['all', 'diary', 'memo', 'minit'] as const).map((k) => (
            <button key={k} className={kindFilter === k ? 'active' : ''} onClick={() => setKindFilter(k)}>
              {k === 'all' ? 'Semua' : KIND_LABEL[k].split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      {/* Doc count */}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        {filtered.length} daripada {docs.length} dokumen dipaparkan
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ height: 140, background: '#f0ece6', borderRadius: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 14, padding: '50px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {docs.length === 0
            ? <><b style={{ display: 'block', marginBottom: 6, color: 'var(--ink)' }}>Belum ada dokumen tersimpan.</b>Jana dokumen dan klik <b>"Simpan ke Sistem"</b> dalam panel pratonton.<br /><button className="btn btn-primary" style={{ marginTop: 14, padding: '9px 20px' }} onClick={onCreateNew}>+ Jana Dokumen Baru</button></>
            : 'Tiada dokumen sepadan dengan carian.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {filtered.map((d) => (
            <div key={d.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Colour top bar */}
              <div style={{ background: KIND_BG[d.kind] ?? '#f5f5f5', borderBottom: `1px solid ${KIND_COLOR[d.kind] ?? '#888'}22`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: KIND_COLOR[d.kind] + '20', border: `1px solid ${KIND_COLOR[d.kind]}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: KIND_COLOR[d.kind], letterSpacing: '.04em', lineHeight: 1.2, textAlign: 'center' }}>
                    {(KIND_LABEL[d.kind] ?? d.kind).split(' ').map((w: string) => w[0]).join('')}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: KIND_COLOR[d.kind], textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  {KIND_LABEL[d.kind] ?? d.kind}
                </span>
              </div>
              {/* Content */}
              <div style={{ padding: '12px 14px', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.35, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {d.title}
                </div>
                {d.project_name && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.project_name}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.created_at ? fmtDate(d.created_at.slice(0, 10)) : ''}</div>
              </div>
              {/* Actions */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '7px 0', fontSize: 12.5 }} onClick={() => setViewing(d)}>Buka</button>
                <button className="btn" style={{ padding: '7px 12px', fontSize: 12, color: '#b00020', borderColor: '#f6c9c9' }} onClick={() => handleDelete(d)}>Padam</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <DocViewerModal url={viewing.signed_url ?? viewing.public_url} htmlPath={viewing.html_path} title={viewing.title} onClose={() => setViewing(null)} />}
    </div>
  );
}
