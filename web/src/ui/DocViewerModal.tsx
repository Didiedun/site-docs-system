import { useEffect, useRef, useState } from 'react';
import { getSignedDocUrl } from '../infrastructure/supabase/repositories';

interface Props {
  url: string;
  htmlPath?: string;
  title: string;
  onClose: () => void;
}

const sBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: 16, zIndex: 200, overflow: 'auto',
};
const sModal: React.CSSProperties = {
  background: '#fff', borderRadius: 14, width: '100%', maxWidth: 960,
  margin: 'auto', boxShadow: '0 16px 56px rgba(0,0,0,.4)',
  display: 'flex', flexDirection: 'column', maxHeight: '96vh',
};

export function DocViewerModal({ url, htmlPath, title, onClose }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let res = await fetch(url);
        // URL may be stale or bucket is private — try a fresh signed URL
        if (!res.ok && (res.status === 400 || res.status === 403) && htmlPath) {
          const fresh = await getSignedDocUrl(htmlPath);
          if (fresh) res = await fetch(fresh);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setHtml(text);
      } catch (e) {
        if (!cancelled) setError(`Gagal memuatkan dokumen: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [url, htmlPath]);

  function handlePrint() {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={sBackdrop} onClick={onClose}>
      <div style={sModal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 12, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Sora, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {html && (
              <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '7px 16px', fontSize: 13 }}>
                Cetak / Simpan PDF
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none', borderLeft: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: '0 6px' }}
              aria-label="Tutup"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', background: '#f2efe9', minHeight: 400 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontSize: 13 }}>
              Memuatkan dokumen…
            </div>
          )}
          {error && (
            <div style={{ margin: 20 }} className="err">{error}</div>
          )}
          {html && (
            <iframe
              ref={frameRef}
              srcDoc={html}
              title={title}
              style={{ width: '100%', height: 1400, border: 0, background: '#fff', display: 'block' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
