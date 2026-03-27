// Login-vy — Google OAuth + E-post/lösenord
import { useState } from 'react'

export default function LoginView({ onSignInGoogle, onSignInEmail, onSignUpEmail, onBack }) {
  const [mode, setMode]       = useState('login') // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = mode === 'login'
        ? await onSignInEmail(email, password)
        : await onSignUpEmail(email, password)
      if (err) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const input = {
    width: '100%', padding: '13px 14px',
    background: '#070714', border: '1px solid #1a1a2e', borderRadius: 10,
    color: '#e0e0e0', fontSize: 16, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 0%, #060618 0%, #02020e 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px 20px',
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Tillbaka */}
        {onBack && (
          <button onClick={onBack} style={{
            background: "none", border: "1px solid #1a1a2e", borderRadius: 10,
            color: "#444", fontSize: 13, padding: "8px 14px", cursor: "pointer", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 6,
          }}>← Tillbaka</button>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 700, margin: '0 0 4px',
            background: 'linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>IdeaDump</h1>
          <p style={{ fontSize: 12, color: '#333', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
            Capture · Analyze · Act
          </p>
        </div>

        {/* Google */}
        <button onClick={onSignInGoogle} style={{
          width: '100%', padding: '13px',
          background: 'linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)',
          border: '1px solid #00F0FF28', borderRadius: 12,
          color: '#e0e0e0', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Fortsätt med Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#111128' }} />
          <span style={{ fontSize: 11, color: '#333' }}>eller</span>
          <div style={{ flex: 1, height: 1, background: '#111128' }} />
        </div>

        {/* E-post-formulär */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="E-post" value={email}
            onChange={e => setEmail(e.target.value)}
            required autoComplete="email" style={input}
          />
          <input
            type="password" placeholder="Lösenord" value={password}
            onChange={e => setPassword(e.target.value)}
            required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={input}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0 }}>{error}</p>
          )}
          <button type="submit" disabled={loading} style={{
            padding: '13px', borderRadius: 12,
            background: loading ? '#111' : '#00F0FF22',
            border: '1px solid #00F0FF44',
            color: loading ? '#444' : '#00F0FF',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
          }}>
            {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </button>
        </form>

        <button onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }}
          style={{
            width: '100%', marginTop: 14, background: 'none', border: 'none',
            color: '#444', fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
          }}>
          {mode === 'login' ? 'Inget konto? Skapa ett' : 'Har du redan ett konto? Logga in'}
        </button>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 10, color: '#222', marginTop: 40, letterSpacing: 1 }}>
          © 2026{' '}
          <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
            style={{ color: '#F2B8B4', textDecoration: 'none' }}>Hackadittliv</a>
          {' · '}Byggt av{' '}
          <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
            style={{ color: '#13c8ec', textDecoration: 'none' }}>Conversify.io</a>
        </p>
      </div>
    </div>
  )
}
