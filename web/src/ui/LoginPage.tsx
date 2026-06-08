import { useAuth } from './AuthProvider';

export function LoginPage() {
  const { signIn } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #f6f3ee 0%, #ede8e0 100%)' }}>
      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 22, padding: '0 0 32px', boxShadow: '0 12px 48px rgba(122,12,46,.13)', maxWidth: 400, width: '90%', textAlign: 'center', border: '1px solid var(--line)', overflow: 'hidden' }}>

        {/* Maroon header band — logo sits here on white background */}
        <div style={{ background: 'linear-gradient(180deg, var(--maroon) 0%, #5c0a23 100%)', padding: '32px 0 24px', marginBottom: 0 }}>
          <div style={{ width: 76, height: 76, background: '#fff', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,.18)' }}>
            <img src="/utm-logo.png" alt="UTM" style={{ height: 54, width: 54, objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, color: '#fff', margin: '0 0 4px', fontWeight: 700, letterSpacing: '-.01em' }}>
            Sistem Dokumen Tapak
          </h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, margin: 0 }}>
            UTM · Jabatan TNC (Pembangunan)
          </p>
        </div>

        {/* Gold divider */}
        <div style={{ height: 3, background: 'var(--gold)' }} />

        {/* Body */}
        <div style={{ padding: '28px 32px 0' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>
            Log masuk untuk mengakses sistem penjanaan dokumen tapak bina UTM.
          </p>

          <button
            onClick={signIn}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #dadce0', borderRadius: 12, padding: '13px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#3c4043', width: '100%', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,.08)', fontFamily: 'inherit', transition: 'box-shadow .15s, border-color .15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.13)'; e.currentTarget.style.borderColor = '#bbb'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,.08)'; e.currentTarget.style.borderColor = '#dadce0'; }}
          >
            <GoogleIcon />
            Log masuk dengan Google
          </button>

          <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 18, lineHeight: 1.6 }}>
            Hanya akaun Google yang dibenarkan.<br />
            Sistem ini untuk kegunaan dalaman UTM sahaja.
          </p>
        </div>
      </div>

      <p style={{ marginTop: 20, color: 'var(--muted)', fontSize: 11 }}>
        Dibangunkan oleh <b style={{ color: 'var(--maroon)' }}>Daniel Dun</b> untuk <b style={{ color: 'var(--maroon)' }}>Hadirah</b>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
