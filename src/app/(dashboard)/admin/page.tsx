import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, Trophy, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { Jogo, Competicao, Escalacao } from '@/types'

type JogoDash = Jogo & { competicao: Competicao | null; escalacoes: Escalacao[] }

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da liga</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Árbitros Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArbitros ?? 0}</div>
            <p className="text-xs text-muted-foreground">cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Jogos Futuros</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJogos ?? 0}</div>
            <p className="text-xs text-muted-foreground">a partir de hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{jogosPendentes ?? 0}</div>
            <p className="text-xs text-muted-foreground">jogos sem árbitros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximos 7 dias</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proximosJogos?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">jogos agendados</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximos jogos */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Jogos (7 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {!proximosJogos?.length ? (
            <p className="text-muted-foreground text-sm">Nenhum jogo nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-3">
              {(proximosJogos as JogoDash[]).map((jogo) => {
                const escalados = jogo.escalacoes?.length ?? 0
                const precisam = jogo.arbitros_necessarios
                const completo = escalados >= precisam

                return (
                  <Link key={jogo.id} href={`/admin/escalacao?jogo=${jogo.id}`}>
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {jogo.mandante} <span className="text-muted-foreground">×</span> {jogo.visitante}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                        </p>
                        <p className="text-xs text-muted-foreground">{jogo.competicao?.nome}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {completo ? (
                          <Badge variant="default" className="bg-green-600">Escalado</Badge>
                        ) : (
                          <Badge variant="destructive">{escalados}/{precisam} árbitros</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
