import { DocumentStudio } from './DocumentStudio';

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20 }}>UTM Site Docs — Studio</h1>
      <p style={{ color: '#555' }}>
        Pilih dokumen, beri site story, jana badan. Header, No. Rujukan & tandatangan
        kekal pada templat anda (mengikut SOP).
      </p>
      <DocumentStudio projectId="demo-project" />
    </div>
  );
}
