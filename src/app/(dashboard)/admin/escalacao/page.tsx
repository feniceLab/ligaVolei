import { createClient } from '@/lib/supabase/server'
import EscalacaoClient from './escalacao-client'

export default async function EscalacaoPage() {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  const [{ data: jogos }, { data: arbitros }] = await Promise.all([
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome), escalacoes(id, arbitro:profiles(id, nome))')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Escalação</h1>
        <p className="text-muted-foreground">Escale árbitros para os jogos</p>
      </div>
      <EscalacaoClient
        jogos={jogos ?? []}
        arbitros={arbitros ?? []}
        disponibilidades={disponibilidades ?? []}
      />
    </div>
  )
}
