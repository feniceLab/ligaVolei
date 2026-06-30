import { createClient } from '@/lib/supabase/server'
import { CalendarDays, Users, Trophy, AlertCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { Jogo, Competicao, Escalacao } from '@/types'

type JogoDash = Jogo & { competicao: Competicao | null; escalacoes: Escalacao[] }

function StatCard({
  label, value, hint, icon: Icon, accent,
}: {
  label: string
  value: number
  hint: string
  icon: typeof Users
  accent?: 'navy' | 'orange'
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
        <span
          className={
            accent === 'orange'
              ? 'rounded-xl bg-brand-orange/10 p-2 text-brand-orange-deep'
              : 'rounded-xl bg-surface-container-high p-2 text-primary'
          }
        >
          <Icon size={18} />
        </span>
      </div>
      <p
        className={`mt-4 font-headline text-4xl font-extrabold tracking-tight ${
          accent === 'orange' ? 'text-brand-orange-deep' : 'text-primary'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
    </div>
  )
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const agora = new Date()
  const hoje = agora.toISOString().split('T')[0]
  const em7dias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalArbitros },
    { count: totalJogos },
    { count: jogosPendentes },
    { data: proximosJogos },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'arbitro').eq('ativo', true),
    supabase.from('jogos').select('*', { count: 'exact', head: true }).gte('data', hoje),
    supabase.from('jogos').select('*', { count: 'exact', head: true }).eq('status', 'pendente').gte('data', hoje),
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome), escalacoes(id, arbitro:profiles(nome))')
      .gte('data', hoje)
      .lte('data', em7dias)
      .order('data', { ascending: true })
      .order('horario', { ascending: true })
      .limit(10),
  ])

  return (
    <div className="space-y-8">
      {/* Header editorial */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Painel da Liga</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Visão geral da arbitragem</p>
        </div>
        <Link
          href="/admin/jogos"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-navy-deep to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[0.98]"
        >
          Novo Jogo
          <ArrowUpRight size={18} />
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Árbitros Ativos" value={totalArbitros ?? 0} hint="cadastrados no sistema" icon={Users} />
        <StatCard label="Jogos Futuros" value={totalJogos ?? 0} hint="a partir de hoje" icon={CalendarDays} />
        <StatCard label="Pendentes" value={jogosPendentes ?? 0} hint="jogos sem árbitros" icon={AlertCircle} accent="orange" />
        <StatCard label="Próximos 7 dias" value={proximosJogos?.length ?? 0} hint="jogos agendados" icon={Trophy} />
      </div>

      {/* Próximos jogos */}
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Próximos Jogos</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">7 dias</span>
        </div>
        <div className="p-4 sm:p-6">
          {!proximosJogos?.length ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum jogo nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-3">
              {(proximosJogos as JogoDash[]).map((jogo) => {
                const escalados = jogo.escalacoes?.length ?? 0
                const precisam = jogo.arbitros_necessarios
                const completo = escalados >= precisam

                return (
                  <Link key={jogo.id} href={`/admin/escalacao?jogo=${jogo.id}`} className="block">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/10 bg-surface p-4 transition-colors hover:bg-surface-container-high">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-bold text-on-surface">
                          {jogo.mandante} <span className="font-normal text-on-surface-variant">×</span> {jogo.visitante}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                        </p>
                        <p className="text-xs font-medium text-on-surface-variant/80">{jogo.competicao?.nome}</p>
                      </div>
                      <span
                        className={
                          completo
                            ? 'shrink-0 rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700'
                            : 'shrink-0 rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-deep'
                        }
                      >
                        {completo ? 'Escalado' : `${escalados}/${precisam} árbitros`}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
