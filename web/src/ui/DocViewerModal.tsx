import { useEffect, useRef, useState } from "react";
import { Dialog, ErrorNotice } from "./WorkspaceUI";
import { getSignedDocUrl } from "../infrastructure/supabase/repositories";

interface Props {
  url: string;
  htmlPath?: string;
  title: string;
  onClose: () => void;
}

export function DocViewerModal({ url, htmlPath, title, onClose }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      setHtml(null);
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
        if (!cancelled)
          setError(`Gagal memuatkan dokumen: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [url, htmlPath]);

  function handlePrint() {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }

  return (
    <Dialog title={title} onClose={onClose} wide>
      {html && (
        <div className="viewer-toolbar">
          <button className="btn btn-primary" onClick={handlePrint}>
            Cetak / Simpan PDF
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="muted">
          Memuatkan dokumen…
        </p>
      )}
      {error && <ErrorNotice message={error} />}
      {html && (
        <div className="viewer-paper">
          <iframe ref={frameRef} srcDoc={html} title={title} />
        </div>
      )}
    </Dialog>
  );
}
