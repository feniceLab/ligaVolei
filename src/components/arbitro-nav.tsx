'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CalendarDays, Wallet, LogOut } from 'lucide-react'

const navItems = [
  { href: '/arbitro', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/arbitro/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/arbitro/financeiro', label: 'Financeiro', icon: Wallet },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

export default function ArbitroNav({ nome }: { nome: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-outline-variant/10 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-lcv.png" alt="Liga Catarinense de Voleibol" className="h-10 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Portal do Árbitro
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop links */}
            <nav className="mr-2 hidden items-center gap-1 sm:flex">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(pathname, href, exact)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wider transition-colors',
                      active
                        ? 'bg-surface-container-lowest text-primary shadow-editorial'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                )
              })}
            </nav>
            <span className="hidden text-sm font-bold text-primary md:block">{nome}</span>
            <button
              onClick={handleLogout}
              title="Sair"
              className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/10 bg-surface-container-lowest/95 backdrop-blur-md sm:hidden">
        <div className="flex items-stretch justify-around">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(pathname, href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                  active ? 'text-primary' : 'text-on-surface-variant'
                )}
              >
                <Icon size={20} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
