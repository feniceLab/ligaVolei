import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import ArbitroEscalacoes from '@/components/arbitro-escalacoes'

export default async function ArbitroDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, valor_por_jogo')
    .eq('user_id', user.id)
    .single()

  const hoje = new Date().toISOString().split('T')[0]

  const [
    { data: proximosJogos },
    { data: minhasEscalacoes },
    { data: minhasDisponibilidades },
  ] = await Promise.all([
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome)')
      .gte('data', hoje)
      .order('data', { ascending: true })
      .limit(5),
    supabase.from('escalacoes')
      .select('id, status, valor, motivo_recusa, jogo:jogos(data, horario, local, mandante, visitante, competicao:competicoes(nome))')
      .eq('arbitro_id', profile?.id)
      .order('escalado_em', { ascending: false })
      .limit(30),
    supabase.from('disponibilidades')
      .select('jogo_id, disponivel')
      .eq('arbitro_id', profile?.id),
  ])

  const dispMap = new Map(minhasDisponibilidades?.map(d => [d.jogo_id, d.disponivel]) ?? [])
  const jogosSemResposta = proximosJogos?.filter(j => !dispMap.has(j.id)) ?? []

  const escList = (minhasEscalacoes ?? []) as unknown as Parameters<typeof ArbitroEscalacoes>[0]['escalacoes']
  const confirmadas = escList.filter(e => e.status === 'confirmada').length
  const pendentesResposta = escList.filter(e => e.status === 'pendente').length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Meu Painel</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Olá, {profile?.nome?.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Painel do árbitro</p>
        </div>
      </div>

      {jogosSemResposta.length > 0 && (
        <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-6 shadow-editorial">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-orange-deep">
            <Clock className="h-4 w-4" />
            {jogosSemResposta.length} jogo(s) aguardando sua disponibilidade
          </p>
          <Link href="/arbitro/calendario" className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4">
            Informar disponibilidade →
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Próximos Jogos</p>
            <span className="rounded-xl bg-surface-container-high p-2 text-primary">
              <CalendarDays size={18} />
            </span>
          </div>
          <p className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary">{proximosJogos?.length ?? 0}</p>
          <p className="mt-1 text-xs text-on-surface-variant">agendados a partir de hoje</p>
        </div>

        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Minhas Escalações</p>
            <span className="rounded-xl bg-surface-container-high p-2 text-primary">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <p className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary">{confirmadas}</p>
          <p className="mt-1 text-xs text-on-surface-variant">jogos confirmados{pendentesResposta > 0 ? ` · ${pendentesResposta} aguardando resposta` : ''}</p>
        </div>
      </div>

      {/* Minhas escalações — confirmar / recusar */}
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Minhas Escalações</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">Confirme ou recuse os jogos em que você foi escalado</p>
        </div>
        <div className="p-4 sm:p-6">
          <ArbitroEscalacoes escalacoes={escList} />
        </div>
      </div>
    </div>
  )
}
