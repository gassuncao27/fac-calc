import { NavLink, Outlet } from 'react-router-dom';
import { Home, Plus, History, Users, Settings as SettingsIcon, DatabaseBackup, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { APP_NAME } from '../constants';

// Resolve contra a base do build — funciona na raiz do domínio e em subpasta
// (GitHub Pages). Um caminho absoluto '/icon.svg' quebraria em subpasta.
const ICON_URL = `${import.meta.env.BASE_URL}icon.svg`;

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/operacoes/nova', label: 'Nova operação', icon: Plus, end: false },
  { to: '/operacoes', label: 'Operações', icon: History, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, end: false },
  { to: '/configuracoes', label: 'Configurações', icon: SettingsIcon, end: false },
  { to: '/backup', label: 'Backup', icon: DatabaseBackup, end: false },
];

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

function OfflineBadge() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
      <WifiOff className="size-3.5" />
      Modo offline
    </span>
  );
}

export function Layout() {
  return (
    <div className="min-h-app bg-[#FAFAF9]">
      {/* Sidebar — tablet horizontal e desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur md:flex">
        <div className="flex items-center gap-2.5 px-6 pb-2 pt-7">
          <img src={ICON_URL} alt="" className="size-8 rounded-lg" />
          <span className="text-[17px] font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3.5 text-[14px] font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 pb-6">
          <OfflineBadge />
        </div>
      </aside>

      {/* Topo — telas pequenas */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <img src={ICON_URL} alt="" className="size-7 rounded-lg" />
          <span className="font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
        </div>
        <OfflineBadge />
      </header>

      <main className="px-4 pb-28 pt-6 md:ml-60 md:px-8 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior — telas pequenas */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navegação principal"
      >
        {MOBILE_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`
            }
          >
            <Icon className="size-5" />
            <span className="truncate">{label === 'Nova operação' ? 'Nova' : label === 'Configurações' ? 'Ajustes' : label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
