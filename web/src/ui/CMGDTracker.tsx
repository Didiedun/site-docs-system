import { useEffect, useState } from 'react';
import { listCMGD, saveCMGD, deleteCMGD, cmgdStatus, type CMGDItem } from '../infrastructure/supabase/repositories';

const STATUS_COLOR: Record<string, string> = {
  overdue: '#b00020', due_soon: '#b45309', active: '#1a6e3c', issued: '#555',
};
const STATUS_BG: Record<string, string> = {
  overdue: '#fff0f0', due_soon: '#fffbeb', active: '#f8fffe', issued: '#f9fafb',
};
const STATUS_BORDER: Record<string, string> = {
  overdue: '#f8c9c9', due_soon: '#fde68a', active: '#bbf7d0', issued: '#e5e7eb',
};
const STATUS_LABEL: Record<string, string> = {
  overdue: 'TAMAT TEMPOH', due_soon: 'HAMPIR TAMAT (≤30 hari)', active: 'Aktif', issued: 'CMGD Dikeluarkan',
};
const STATUS_BANNER: Record<string, string> = {
  overdue: 'TINDAKAN DIPERLUKAN', due_soon: 'PERHATIAN — Hampir Tamat',
};

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
function daysUntil(dateStr: string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)} hari telah lepas`;
  if (d === 0) return 'Hari ini!';
  return `${d} hari lagi`;
}
function addMonths(iso: string, months: number): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function dlpProgress(item: CMGDItem): number {
  const start = new Date(item.practical_completion_date).getTime();
  const end = new Date(item.dlp_end_date).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

const EMPTY: CMGDItem = {
  project_name: '', contractor: '', contract_no: '',
  practical_completion_date: '', dlp_months: 12, dlp_end_date: '',
  cmgd_issued_date: null, notes: '',
};

export function CMGDTracker() {
  const [items, setItems] = useState<CMGDItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CMGDItem>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon' | 'active' | 'issued'>('all');

  async function reload() {
    setLoading(true);
    try { setItems(await listCMGD()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  function openNew() { setEditing(EMPTY); setShowForm(true); setError(''); }
  function openEdit(item: CMGDItem) { setEditing({ ...item }); setShowForm(true); setError(''); }

  function handlePCDateChange(iso: string) {
    setEditing((prev) => ({
      ...prev,
      practical_completion_date: iso,
      dlp_end_date: iso ? addMonths(iso, prev.dlp_months) : '',
    }));
  }
  function handleDlpMonthsChange(m: number) {
    setEditing((prev) => ({
      ...prev,
      dlp_months: m,
      dlp_end_date: prev.practical_completion_date ? addMonths(prev.practical_completion_date, m) : '',
    }));
  }

  async function handleSave() {
    if (!editing.project_name || !editing.contractor || !editing.practical_completion_date) {
      setError('Sila isi semua medan yang wajib.'); return;
    }
    setSaving(true); setError('');
    try { await saveCMGD(editing); setShowForm(false); await reload(); }
    catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Padam rekod CMGD ini?')) return;
    try { await deleteCMGD(id); await reload(); }
    catch (e) { setError(String(e)); }
  }

  async function markIssued(item: CMGDItem) {
    const today = new Date().toISOString().slice(0, 10);
    try { await saveCMGD({ ...item, cmgd_issued_date: today }); await reload(); }
    catch (e) { setError(String(e)); }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => cmgdStatus(i) === filter);
  const overdueCt = items.filter((i) => cmgdStatus(i) === 'overdue').length;
  const dueSoonCt = items.filter((i) => cmgdStatus(i) === 'due_soon').length;

  return (
    <div style={{ maxWidth: 880 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, margin: '0 0 3px', color: 'var(--maroon)' }}>
            CMGD — Certificate of Making Good Defects
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>
            Pantau tempoh liabiliti kecacatan (DLP) dan status pengeluaran CMGD.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Tambah Rekod</button>
      </div>

      {/* Alert banner */}
      {!loading && (overdueCt > 0 || dueSoonCt > 0) && (
        <div style={{ background: overdueCt > 0 ? '#fff0f0' : '#fffbeb', border: `1px solid ${overdueCt > 0 ? '#f8c9c9' : '#fde68a'}`, borderLeft: `5px solid ${overdueCt > 0 ? '#b00020' : '#b45309'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
          {overdueCt > 0 && (
            <div style={{ fontWeight: 700, fontSize: 13, color: '#b00020', marginBottom: dueSoonCt > 0 ? 4 : 0 }}>
              {overdueCt} projek telah tamat tempoh DLP — CMGD perlu dikeluarkan segera.
            </div>
          )}
          {dueSoonCt > 0 && (
            <div style={{ fontWeight: 600, fontSize: 13, color: '#b45309' }}>
              {dueSoonCt} projek akan tamat DLP dalam masa 30 hari — sedia proses CMGD.
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="seg" style={{ marginBottom: 18 }}>
        {(['all', 'overdue', 'due_soon', 'active', 'issued'] as const).map((f) => {
          const ct = f === 'all' ? items.length : items.filter((i) => cmgdStatus(i) === f).length;
          return (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}
              style={f === 'overdue' && ct > 0 ? { color: '#b00020', fontWeight: 700 } : f === 'due_soon' && ct > 0 ? { color: '#b45309', fontWeight: 700 } : {}}>
              {f === 'all' ? 'Semua' : STATUS_LABEL[f].split(' (')[0]} ({ct})
            </button>
          );
        })}
      </div>

      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 120, background: '#f0ece6', borderRadius: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed var(--line)', borderRadius: 12, padding: '36px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Tiada rekod.{' '}
          <button className="btn" style={{ padding: '5px 12px', marginLeft: 6 }} onClick={openNew}>+ Tambah</button>
        </div>
      ) : (
        filtered.map((item) => {
          const s = cmgdStatus(item);
          const progress = dlpProgress(item);
          const showBanner = s === 'overdue' || s === 'due_soon';
          return (
            <div key={item.id} style={{
              background: STATUS_BG[s],
              border: `1px solid ${STATUS_BORDER[s]}`,
              borderLeft: `5px solid ${STATUS_COLOR[s]}`,
              borderRadius: 12,
              marginBottom: 14,
              overflow: 'hidden',
            }}>
              {/* Warning banner */}
              {showBanner && (
                <div style={{ background: STATUS_COLOR[s], padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em' }}>
                    {STATUS_BANNER[s]}
                  </span>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, background: 'rgba(0,0,0,.15)', borderRadius: 4, padding: '1px 8px' }}>
                    {daysUntil(item.dlp_end_date)}
                  </span>
                </div>
              )}

              <div style={{ padding: '14px 16px' }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ background: STATUS_COLOR[s], color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px' }}>
                        {STATUS_LABEL[s].split(' (')[0]}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{item.project_name}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {item.contractor}{item.contract_no ? ` · ${item.contract_no}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, flexShrink: 0, flexWrap: 'wrap' }}>
                    {s !== 'issued' && (
                      <button className="btn" style={{ padding: '5px 12px', fontSize: 12, background: '#ecfdf5', color: '#1a6e3c', borderColor: '#a7f3d0' }} onClick={() => markIssued(item)}>
                        Tandakan CMGD Dikeluarkan
                      </button>
                    )}
                    <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn" style={{ padding: '5px 12px', fontSize: 12, color: '#b00020', borderColor: '#f6c9c9' }} onClick={() => handleDelete(item.id!)}>Padam</button>
                  </div>
                </div>

                {/* Info row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '6px 16px', fontSize: 12, marginBottom: 10 }}>
                  <div><span style={{ color: 'var(--muted)' }}>Siap Praktikal</span><br /><b>{fmtDate(item.practical_completion_date)}</b></div>
                  <div><span style={{ color: 'var(--muted)' }}>Tempoh DLP</span><br /><b>{item.dlp_months} bulan</b></div>
                  <div><span style={{ color: 'var(--muted)' }}>Tamat DLP</span><br /><b style={{ color: s === 'overdue' ? '#b00020' : s === 'due_soon' ? '#b45309' : 'inherit' }}>{fmtDate(item.dlp_end_date)}</b></div>
                  {item.cmgd_issued_date
                    ? <div><span style={{ color: 'var(--muted)' }}>CMGD Dikeluarkan</span><br /><b style={{ color: '#1a6e3c' }}>{fmtDate(item.cmgd_issued_date)}</b></div>
                    : !showBanner && <div><span style={{ color: 'var(--muted)' }}>Baki Masa</span><br /><b style={{ color: STATUS_COLOR[s] }}>{daysUntil(item.dlp_end_date)}</b></div>
                  }
                </div>

                {/* DLP Progress bar */}
                {s !== 'issued' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                      <span>Kemajuan DLP</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: progress >= 100 ? '#b00020' : progress >= 85 ? '#b45309' : '#1a6e3c',
                        borderRadius: 4,
                        transition: 'width .4s',
                      }} />
                    </div>
                  </div>
                )}

                {item.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 8 }}>
                    {item.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 12px 48px rgba(0,0,0,.25)', overflow: 'auto', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontFamily: 'Sora, sans-serif', fontSize: 15 }}>{editing.id ? 'Edit Rekod CMGD' : 'Rekod CMGD Baharu'}</b>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '0 6px' }}>×</button>
            </div>
            <div style={{ padding: '18px 18px 10px' }}>
              <div className="field"><label>Nama Projek *</label><input value={editing.project_name} onChange={(e) => setEditing((p) => ({ ...p, project_name: e.target.value }))} /></div>
              <div className="field"><label>Kontraktor *</label><input value={editing.contractor} onChange={(e) => setEditing((p) => ({ ...p, contractor: e.target.value }))} /></div>
              <div className="field"><label>No. Kontrak / Sebutharga</label><input value={editing.contract_no ?? ''} onChange={(e) => setEditing((p) => ({ ...p, contract_no: e.target.value }))} /></div>
              <div className="grid2">
                <div className="field">
                  <label>Tarikh Siap Praktikal *</label>
                  <input type="date" value={editing.practical_completion_date} onChange={(e) => handlePCDateChange(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tempoh DLP (bulan)</label>
                  <select value={editing.dlp_months} onChange={(e) => handleDlpMonthsChange(Number(e.target.value))}>
                    {[6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} bulan</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Tarikh Tamat DLP (dikira auto)</label>
                <input value={editing.dlp_end_date ? fmtDate(editing.dlp_end_date) : ''} readOnly style={{ background: '#f3efe9', color: 'var(--muted)' }} />
              </div>
              <div className="field">
                <label>Tarikh CMGD Dikeluarkan (kosong jika belum)</label>
                <input type="date" value={editing.cmgd_issued_date ?? ''} onChange={(e) => setEditing((p) => ({ ...p, cmgd_issued_date: e.target.value || null }))} />
              </div>
              <div className="field"><label>Nota</label><textarea style={{ minHeight: 70 }} value={editing.notes ?? ''} onChange={(e) => setEditing((p) => ({ ...p, notes: e.target.value }))} /></div>
              {error && <div className="err">{error}</div>}
              <div className="btn-row" style={{ paddingBottom: 8 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
                <button className="btn" onClick={() => setShowForm(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
