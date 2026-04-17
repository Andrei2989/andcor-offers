import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } catch (err) {
      setError((err as Error).message ?? 'Eroare necunoscută');
      console.error('Login error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-100 px-4">
      <form onSubmit={onSubmit} className="card p-6 w-full max-w-sm">
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-navy">ANDCOR — Oferte</h1>
          <p className="text-sm text-ink-500 mt-1">Autentificare</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Parolă</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm text-red-700">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Se autentifică…' : 'Intră'}
          </button>
        </div>
      </form>
    </div>
  );
}
