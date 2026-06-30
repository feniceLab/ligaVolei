import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import type { Escalacao, Jogo, Competicao } from '@/types'

type EscalacaoComJogo = Escalacao & { jogo: (Jogo & { competicao: Competicao | null }) | null }

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
      .select('*, jogo:jogos(data, horario, local, mandante, visitante, competicao:competicoes(nome))')
      .eq('arbitro_id', profile?.id)
      .gte('jogo.data', hoje)
      .order('escalado_em', { ascending: false })
      .limit(5),
    supabase.from('disponibilidades')
      .select('jogo_id, disponivel')
      .eq('arbitro_id', profile?.id),
  ])

  const dispMap = new Map(minhasDisponibilidades?.map(d => [d.jogo_id, d.disponivel]) ?? [])
  const jogosSemResposta = proximosJogos?.filter(j => !dispMap.has(j.id)) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {profile?.nome?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground">Painel do árbitro</p>
      </div>

      {jogosSemResposta.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <Clock className="h-4 w-4" />
              {jogosSemResposta.length} jogo(s) aguardando sua disponibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/arbitro/calendario" className="text-sm text-primary underline underline-offset-4">
              Informar disponibilidade →
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximos Jogos</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proximosJogos?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">agendados a partir de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Minhas Escalações</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{minhasEscalacoes?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">jogos confirmados</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas escalações */}
      {minhasEscalacoes && minhasEscalacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Minhas Próximas Escalações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(minhasEscalacoes as EscalacaoComJogo[]).map((esc) => {
              const jogo = esc.jogo
              if (!jogo) return null
              return (
                <div key={esc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{jogo.mandante} × {jogo.visitante}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                    </p>
                    <p className="text-xs text-muted-foreground">{jogo.competicao?.nome}</p>
                  </div>
                  <Badge variant="default" className="bg-green-600 shrink-0">Confirmado</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
