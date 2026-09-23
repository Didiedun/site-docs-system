import { useEffect, useState } from "react";

export function GenerationProgress({ parsing = false }: { parsing?: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="generation-progress">
      <div className="generation-paper" aria-hidden="true">
        <span className="generation-paper-mark" />
        <i />
        <i />
        <i />
        <i />
        <i />
        <span className="generation-scan" />
      </div>
      <div role="status" aria-live="polite">
        <p className="eyebrow">{parsing ? "JADUAL KERJA" : "STUDIO DOKUMEN"}</p>
        <h3>{parsing ? "Membaca fail MPP…" : "Menyediakan dokumen anda…"}</h3>
        <p>
          {seconds >= 45
            ? "Masih diproses. Pelayan mungkin memerlukan masa tambahan. Kekalkan halaman ini terbuka."
            : parsing
              ? "Jadual projek sedang dibaca untuk membantu penyediaan dokumen."
              : "Catatan anda sedang diproses dan disusun ke dalam format dokumen."}
        </p>
      </div>
      <div className="generation-time" aria-hidden="true">
        <span className="activity-dot" />
        {seconds}s berlalu
      </div>
      <p className="generation-footnote">
        {parsing
          ? "Maklumat borang anda dikekalkan."
          : "Semak kandungan selepas dokumen siap dijana."}
      </p>
    </div>
  );
}
