import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [sent, setSent]       = useState(false)

  const { resetPasswordForEmail } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPasswordForEmail(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-100 tracking-tight">Plume</span>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-200 font-medium mb-2">Email envoyé</p>
              <p className="text-sm text-gray-500 mb-6">
                Si un compte existe pour <strong className="text-gray-300">{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe.
              </p>
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-100 mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-gray-500 mb-6">
                Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <input id="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com" className="input-field" />
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Envoi…
                    </>
                  ) : 'Envoyer le lien'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  ← Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">Plume AI Editorial Engine</p>
      </div>
    </div>
  )
}
