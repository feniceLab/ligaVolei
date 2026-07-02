'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Trophy, CalendarDays, UserCheck, BarChart3,
  LogOut, PlusCircle, Menu, X, Wallet, DollarSign,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/competicoes', label: 'Competições', icon: Trophy },
  { href: '/admin/arbitros', label: 'Árbitros', icon: Users },
  { href: '/admin/jogos', label: 'Jogos', icon: CalendarDays },
  { href: '/admin/escalacao', label: 'Escalação', icon: UserCheck },
  { href: '/admin/valores', label: 'Valores', icon: DollarSign },
  { href: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-lcv.png" alt="Liga Catarinense de Voleibol" className="h-12 w-auto" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
        Arbitragem
      </span>
    </div>
  )
}

export default function AdminNav({ nome }: { nome: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-1 px-4">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200',
              active
                ? 'bg-surface-container-lowest text-primary shadow-editorial'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            <Icon size={20} className={active ? 'text-primary' : 'text-on-surface-variant'} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[260px] flex-col border-r border-outline-variant/10 bg-surface-container-low lg:flex">
        <div className="p-7 pb-5">
          <Brand />
        </div>
        <NavLinks />
        <div className="space-y-4 p-4">
          <Link
            href="/admin/jogos"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-navy-deep to-primary-container px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[0.98]"
          >
            <PlusCircle size={20} />
            Novo Jogo
          </Link>
          <div className="border-t border-outline-variant/20 pt-3">
            <div className="flex items-center justify-between px-2">
              <div className="leading-tight">
                <p className="truncate text-sm font-bold text-primary">{nome || 'Administrador'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
                  Comissão da Liga
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-outline-variant/10 bg-surface/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="p-2 text-primary" aria-label="Abrir menu">
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-primary/20 backdrop-blur-sm lg:hidden"
          />
          <aside className="fixed left-0 top-0 z-[70] flex h-full w-[280px] flex-col bg-surface-container-low lg:hidden">
            <div className="flex items-center justify-between p-7 pb-5">
              <Brand />
              <button onClick={() => setOpen(false)} className="text-primary" aria-label="Fechar menu">
                <X size={24} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
