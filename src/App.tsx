import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import OffersList from '@/pages/OffersList';
import OfferEditor from '@/pages/OfferEditor';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import DevPdf from '@/pages/DevPdf';

export default function App() {
  // Dev-only route is always available — useful when Supabase isn't configured yet.
  return (
    <Routes>
      <Route path="/dev/pdf" element={<DevPdf />} />
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}

function ProtectedShell() {
  const { session, loading } = useAuth();

  // If env vars aren't set, auth will always fail — guide the user to the dev page.
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-6 max-w-lg text-center">
          <h1 className="text-xl font-bold text-navy mb-2">Supabase neconfigurat</h1>
          <p className="text-sm text-ink-700 mb-4">
            Copiază <code className="bg-ink-100 px-1 rounded">.env.example</code> în{' '}
            <code className="bg-ink-100 px-1 rounded">.env.local</code> și setează{' '}
            <code>VITE_SUPABASE_URL</code> + <code>VITE_SUPABASE_ANON_KEY</code>, apoi repornește serverul.
          </p>
          <a href="/dev/pdf" className="btn-primary">Vezi previzualizare PDF (demo)</a>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-500">Se încarcă…</div>;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Routes>
        <Route index element={<OffersList />} />
        <Route path="offers/:id/edit" element={<OfferEditor />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
