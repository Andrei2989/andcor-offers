import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, session } = useAuth();
  const loc = useLocation();

  const tabs = [
    { to: '/', label: 'Oferte' },
    { to: '/settings', label: 'Setări' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-wide">
            ANDCOR <span className="text-gold">• Oferte</span>
          </Link>
          <nav className="flex items-center gap-1">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm',
                  loc.pathname === t.to || (t.to === '/' && loc.pathname.startsWith('/offers'))
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                )}
              >
                {t.label}
              </Link>
            ))}
            {session && (
              <button
                onClick={() => signOut()}
                className="ml-2 px-3 py-1.5 text-sm rounded-md hover:bg-white/5"
              >
                Ieșire
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
