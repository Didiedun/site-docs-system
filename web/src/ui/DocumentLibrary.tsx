import { useEffect, useState } from 'react';
import { listArchivedDocs, deleteArchivedDoc, type ArchivedDoc } from '../infrastructure/supabase/repositories';

const KIND_LABEL: Record<string, string> = { diary: 'Site Diary', memo: 'Memo', minit: 'Minit Mesyuarat' };

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
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, margin: '0 0 3px', color: 'var(--maroon)' }}>Arkib Dokumen</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Dokumen yang telah dijana dan disimpan ke sistem.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateNew}>+ Jana Dokumen Baru</button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          placeholder="Cari mengikut tajuk atau projek…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 9, font: 'inherit', fontSize: 13.5 }}
        />
        <div className="seg">
          {(['all', 'diary', 'memo', 'minit'] as const).map((k) => (
            <button key={k} className={kindFilter === k ? 'active' : ''} onClick={() => setKindFilter(k)}>
              {k === 'all' ? 'Semua' : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuatkan…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {docs.length === 0
            ? <>Tiada dokumen tersimpan. Jana dokumen dan klik <b>"Simpan ke Sistem"</b> dalam tetingkap pratonton.</>
            : 'Tiada dokumen sepadan dengan carian.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((d) => (
            <div key={d.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--maroon)', letterSpacing: '.02em', textAlign: 'center', lineHeight: 1.2 }}>{(KIND_LABEL[d.kind] ?? d.kind).split(' ').map(w => w[0]).join('')}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 6px', fontSize: 11, marginRight: 6 }}>{KIND_LABEL[d.kind] ?? d.kind}</span>
                  {d.project_name && <span style={{ marginRight: 8 }}>{d.project_name} · </span>}
                  {d.created_at && fmtDate(d.created_at.slice(0, 10))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={d.public_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none' }}>
                  Buka
                </a>
                <button className="btn" style={{ padding: '6px 10px', fontSize: 12, color: '#b00020', borderColor: '#f6c9c9' }} onClick={() => handleDelete(d)}>
                  Padam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        {filtered.length} daripada {docs.length} dokumen dipaparkan
      </div>
    </div>
  );
}
