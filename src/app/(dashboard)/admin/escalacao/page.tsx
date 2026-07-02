import { createClient } from '@/lib/supabase/server'
import EscalacaoClient from './escalacao-client'
import { scoreArbitro, type ArbitroStats, type ScoreResult } from '@/lib/score'

export default async function EscalacaoPage() {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  const [{ data: jogos }, { data: arbitros }] = await Promise.all([
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome), escalacoes(id, status, arbitro:profiles(id, nome))')
      .gte('data', hoje)
      .neq('status', 'cancelado')
      .order('data', { ascending: true })
      .order('horario', { ascending: true }),
    supabase.from('profiles')
      .select('id, nome, categoria, valor_por_jogo')
      .eq('role', 'arbitro')
      .eq('ativo', true)
      .order('nome'),
  ])

  // Busca disponibilidades para os jogos futuros
  const jogoIds = (jogos ?? []).map(j => j.id)
  const { data: disponibilidades } = jogoIds.length
    ? await supabase.from('disponibilidades').select('arbitro_id, jogo_id, disponivel').in('jogo_id', jogoIds)
    : { data: [] }

  // Score de confiabilidade por árbitro (advisory)
  const { data: stats } = await supabase.from('v_arbitro_stats').select('*')
  const scores: Record<string, ScoreResult> = {}
  for (const s of (stats ?? []) as ArbitroStats[]) {
    scores[s.arbitro_id] = scoreArbitro(s)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Arbitragem</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Escalação</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Escale árbitros para os jogos</p>
        </div>
      </div>
      <EscalacaoClient
        jogos={jogos ?? []}
        arbitros={arbitros ?? []}
        disponibilidades={disponibilidades ?? []}
        scores={scores}
      />
    </div>
  )
}
