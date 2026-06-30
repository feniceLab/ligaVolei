'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, UserPlus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Jogo, Disponibilidade } from '@/types'

type ArbitroResumo = { id: string; nome: string; categoria: string | null; valor_por_jogo: number }
type EscalacaoResumo = { id: string; arbitro: { id: string; nome: string } | null }
type JogoComEscalacoes = Jogo & { escalacoes: EscalacaoResumo[] }

interface Props {
  jogos: JogoComEscalacoes[]
  arbitros: ArbitroResumo[]
  disponibilidades: Pick<Disponibilidade, 'jogo_id' | 'arbitro_id' | 'disponivel'>[]
}

export default function EscalacaoClient({ jogos, arbitros, disponibilidades }: Props) {
  const router = useRouter()
  const [expandido, setExpandido] = useState<string | null>(jogos[0]?.id ?? null)
  const [loading, setLoading] = useState<string | null>(null)

  // Map: jogo_id -> Set<arbitro_id disponivel>
  const dispMap = new Map<string, Set<string>>()
  disponibilidades.forEach(d => {
    if (d.disponivel) {
      if (!dispMap.has(d.jogo_id)) dispMap.set(d.jogo_id, new Set())
      dispMap.get(d.jogo_id)!.add(d.arbitro_id)
    }
  })

  // Map: jogo_id -> Set<arbitro_id indisponivel>
  const indispMap = new Map<string, Set<string>>()
  disponibilidades.forEach(d => {
    if (!d.disponivel) {
      if (!indispMap.has(d.jogo_id)) indispMap.set(d.jogo_id, new Set())
      indispMap.get(d.jogo_id)!.add(d.arbitro_id)
    }
  })

  async function escalar(jogoId: string, arbitroId: string) {
    setLoading(arbitroId)

    // Validação de conflito de horário
    const jogoAlvo = jogos.find(j => j.id === jogoId)
    const arbitro = arbitros.find(a => a.id === arbitroId)
    if (jogoAlvo) {
      const conflito = jogos.find(j =>
        j.id !== jogoId &&
        j.data === jogoAlvo.data &&
        j.horario === jogoAlvo.horario &&
        j.escalacoes?.some((e: EscalacaoResumo) => e.arbitro?.id === arbitroId)
      )
      if (conflito) {
        toast.error(`Conflito: ${arbitro?.nome ?? 'Árbitro'} já está escalado em ${conflito.mandante} × ${conflito.visitante} neste horário.`)
        setLoading(null)
        return
      }
    }

    const supabase = createClient()
    const { error } = await supabase.from('escalacoes').insert({ jogo_id: jogoId, arbitro_id: arbitroId })
    if (error) toast.error('Erro ao escalar: ' + error.message)
    else {
      const totalEscalados = (jogoAlvo?.escalacoes?.length ?? 0) + 1
      if (jogoAlvo && totalEscalados >= jogoAlvo.arbitros_necessarios) {
        await supabase.from('jogos').update({ status: 'escalado' }).eq('id', jogoId)
      }
      toast.success('Árbitro escalado!')
    }
    setLoading(null)
    router.refresh()
  }

  async function removerEscalacao(escalacaoId: string, jogoId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('escalacoes').delete().eq('id', escalacaoId)
    if (error) toast.error('Erro ao remover escalação')
    else {
      await supabase.from('jogos').update({ status: 'pendente' }).eq('id', jogoId)
      toast.success('Escalação removida')
    }
    router.refresh()
  }

  if (jogos.length === 0) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Nenhum jogo futuro encontrado.</p>
  }

  return (
    <div className="space-y-3">
      {jogos.map((jogo) => {
        const escalados = jogo.escalacoes ?? []
        const escaladosIds = new Set(escalados.map((e: EscalacaoResumo) => e.arbitro?.id))
        const vagas = jogo.arbitros_necessarios - escalados.length
        const completo = vagas <= 0
        const disponiveis = arbitros.filter(a => dispMap.get(jogo.id)?.has(a.id) && !escaladosIds.has(a.id))
        const semResposta = arbitros.filter(a => !dispMap.get(jogo.id)?.has(a.id) && !indispMap.get(jogo.id)?.has(a.id) && !escaladosIds.has(a.id))
        const isOpen = expandido === jogo.id

        return (
          <Card key={jogo.id}>
            <CardHeader
              className="cursor-pointer pb-3"
              onClick={() => setExpandido(isOpen ? null : jogo.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {jogo.mandante} × {jogo.visitante}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                  </p>
                  <p className="text-xs text-muted-foreground">{jogo.competicao?.nome}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {completo
                    ? <Badge className="bg-green-600">Completo</Badge>
                    : <Badge variant="destructive">{vagas} vaga{vagas !== 1 ? 's' : ''}</Badge>
                  }
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-4 pt-0">
                {/* Escalados */}
                {escalados.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Escalados</p>
                    <div className="space-y-1">
                      {escalados.map((esc: EscalacaoResumo) => (
                        <div key={esc.id} className="flex items-center justify-between rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-sm">{esc.arbitro?.nome}</span>
                          </div>
                          <Button
                            size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removerEscalacao(esc.id, jogo.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disponíveis para escalar */}
                {!completo && disponiveis.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Disponíveis</p>
                    <div className="space-y-1">
                      {disponiveis.map((a: ArbitroResumo) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md bg-accent px-3 py-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                            <div>
                              <span className="text-sm">{a.nome}</span>
                              {a.categoria && <span className="text-xs text-muted-foreground ml-2">({a.categoria})</span>}
                            </div>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            disabled={loading === a.id}
                            onClick={() => escalar(jogo.id, a.id)}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            {loading === a.id ? '...' : 'Escalar'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sem resposta - pode forçar escalação */}
                {!completo && semResposta.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Sem resposta</p>
                    <div className="space-y-1">
                      {semResposta.slice(0, 5).map((a: ArbitroResumo) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 opacity-70">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-yellow-500" />
                            <span className="text-sm">{a.nome}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => escalar(jogo.id, a.id)}>
                            <UserPlus className="h-3 w-3 mr-1" /> Forçar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!completo && disponiveis.length === 0 && semResposta.length === 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Nenhum árbitro disponível para este jogo.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
