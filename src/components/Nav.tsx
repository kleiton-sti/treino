import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Hoje', icon: '◉' },
  { to: '/treino', label: 'Treino', icon: '▶' },
  { to: '/plano', label: 'Plano', icon: '≡' },
  { to: '/corpo', label: 'Corpo', icon: '◔' },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙' },
];

export function Nav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul className="mx-auto flex max-w-md justify-around pb-[max(env(safe-area-inset-bottom),6px)] pt-1">
        {ITEMS.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-col items-center justify-center rounded-xl text-xs font-medium ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                }`
              }
            >
              <span aria-hidden className="text-lg leading-none">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
