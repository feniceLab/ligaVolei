import { createClient } from '@/lib/supabase/server'
import CalendarioGrade from '@/components/calendario-grade'

export default async function CalendarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const hoje = new Date().toISOString().split('T')[0]

  const [{ data: jogos }, { data: minhasDisp }, { data: minhasEsc }] = await Promise.all([
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome, categoria)')
      .gte('data', hoje)
      .neq('status', 'cancelado')
      .order('data', { ascending: true })
      .order('horario', { ascending: true }),
    supabase.from('disponibilidades')
      .select('jogo_id, disponivel')
      .eq('arbitro_id', profile?.id),
    supabase.from('escalacoes')
      .select('jogo_id')
      .eq('arbitro_id', profile?.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">MINHA AGENDA</p>
        <h1 className="mt-1 font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">Calendário</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Informe sua disponibilidade para cada jogo</p>
      </div>
      <CalendarioGrade
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jogos={(jogos ?? []).map((j: any) => {
          const c = Array.isArray(j.competicao) ? j.competicao[0] : j.competicao
          return { id: j.id, data: j.data, horario: j.horario, mandante: j.mandante, visitante: j.visitante, local: j.local, competicao_nome: c?.nome ?? '' }
        })}
        dispInicial={Object.fromEntries((minhasDisp ?? []).map(d => [d.jogo_id, d.disponivel]))}
        escaladoIds={(minhasEsc ?? []).map(e => e.jogo_id)}
        arbitroId={profile?.id ?? ''}
        editable
      />
    </div>
  )
}
