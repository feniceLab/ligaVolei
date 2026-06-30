import { createClient } from '@/lib/supabase/server'
import CalendarioClient from './calendario-client'

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
        <h1 className="text-2xl font-bold">Calendário de Jogos</h1>
        <p className="text-muted-foreground">Informe sua disponibilidade para cada jogo</p>
      </div>
      <CalendarioClient
        jogos={jogos ?? []}
        disponibilidades={minhasDisp ?? []}
        escalacoes={minhasEsc ?? []}
        arbitroId={profile?.id ?? ''}
      />
    </div>
  )
}
