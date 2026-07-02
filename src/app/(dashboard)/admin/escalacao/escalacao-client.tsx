'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, UserPlus, Trash2, ChevronDown, ChevronUp, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Jogo, Disponibilidade } from '@/types'
import { scoreCor, type ScoreResult } from '@/lib/score'

type ArbitroResumo = { id: string; nome: string; categoria: string | null; valor_por_jogo: number }
type EscalacaoResumo = { id: string; status?: string; arbitro: { id: string; nome: string } | null }
type JogoComEscalacoes = Jogo & { escalacoes: EscalacaoResumo[] }

interface Props {
  jogos: JogoComEscalacoes[]
  arbitros: ArbitroResumo[]
  disponibilidades: Pick<Disponibilidade, 'jogo_id' | 'arbitro_id' | 'disponivel'>[]
  scores: Record<string, ScoreResult>
}

export default function EscalacaoClient({ jogos, arbitros, disponibilidades, scores }: Props) {
  const scoreDe = (id: string) => scores[id]?.score ?? 60
  const porScore = (a: ArbitroResumo, b: ArbitroResumo) => scoreDe(b.id) - scoreDe(a.id)

  function Selo({ id }: { id: string }) {
    const s = scores[id]
    if (!s) return null
    return (
      <span className="flex shrink-0 items-center gap-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreCor(s.score)}`} title="Score de confiabilidade">
          <TrendingUp size={10} />{s.score}
        </span>
        {s.cherry && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive" title="Tende a recusar jogos de valor baixo">
            <AlertTriangle size={10} />só jogo grande
          </span>
        )}
      </span>
    )
  }
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

    const res = await fetch('/api/escalacao/escalar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogo_id: jogoId, arbitro_id: arbitroId }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error('Erro ao escalar: ' + (d.error || res.statusText))
    } else {
      const d = await res.json().catch(() => ({}))
      toast.success(d.valor != null
        ? `Escalado! Valor: ${Number(d.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — árbitro notificado.`
        : 'Árbitro escalado e notificado!')
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
    return <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum jogo futuro encontrado.</p>
  }

  return (
    <div className="space-y-3">
      {jogos.map((jogo) => {
        const escalados = jogo.escalacoes ?? []
        const escaladosIds = new Set(escalados.map((e: EscalacaoResumo) => e.arbitro?.id))
        const vagas = jogo.arbitros_necessarios - escalados.length
        const completo = vagas <= 0
        const disponiveis = arbitros.filter(a => dispMap.get(jogo.id)?.has(a.id) && !escaladosIds.has(a.id)).sort(porScore)
        const semResposta = arbitros.filter(a => !dispMap.get(jogo.id)?.has(a.id) && !indispMap.get(jogo.id)?.has(a.id) && !escaladosIds.has(a.id)).sort(porScore)
        const isOpen = expandido === jogo.id

        return (
          <div key={jogo.id} className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
            <div
              className="flex cursor-pointer items-start justify-between gap-2 border-b border-outline-variant/10 px-6 py-4 transition-colors hover:bg-surface-container-high"
              onClick={() => setExpandido(isOpen ? null : jogo.id)}
            >
              <div className="space-y-1">
                <h3 className="font-headline text-lg font-bold text-primary">
                  {jogo.mandante} × {jogo.visitante}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                </p>
                <p className="text-xs font-medium text-on-surface-variant/80">{jogo.competicao?.nome}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {completo
                  ? <span className="rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">Completo</span>
                  : <span className="rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-deep">{vagas} vaga{vagas !== 1 ? 's' : ''}</span>
                }
                {isOpen ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
              </div>
            </div>

            {isOpen && (
              <div className="space-y-4 p-4 sm:p-6">
                {/* Escalados */}
                {escalados.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Escalados</p>
                    <div className="space-y-1">
                      {escalados.map((esc: EscalacaoResumo) => {
                        const st = esc.status ?? 'pendente'
                        const badge = st === 'confirmada'
                          ? { txt: 'Confirmou', cls: 'bg-green-600/15 text-green-700' }
                          : st === 'recusada'
                          ? { txt: 'Recusou', cls: 'bg-destructive/10 text-destructive' }
                          : { txt: 'Aguardando', cls: 'bg-brand-orange/15 text-brand-orange-deep' }
                        return (
                          <div key={esc.id} className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-sm font-medium text-on-surface">{esc.arbitro?.nome}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>{badge.txt}</span>
                            </div>
                            <Button
                              size="sm" variant="ghost" className="h-6 w-6 p-0 text-on-surface-variant hover:text-destructive"
                              onClick={() => removerEscalacao(esc.id, jogo.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Disponíveis para escalar */}
                {!completo && disponiveis.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Disponíveis</p>
                    <div className="space-y-1">
                      {disponiveis.map((a: ArbitroResumo) => (
                        <div key={a.id} className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface px-3 py-2 transition-colors hover:bg-surface-container-high">
                          <div className="flex min-w-0 items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-on-surface">{a.nome}</span>
                              {a.categoria && <span className="ml-2 text-xs text-on-surface-variant">({a.categoria})</span>}
                            </div>
                            <Selo id={a.id} />
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
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Sem resposta</p>
                    <div className="space-y-1">
                      {semResposta.slice(0, 5).map((a: ArbitroResumo) => (
                        <div key={a.id} className="flex items-center justify-between rounded-xl border border-outline-variant/10 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-brand-orange-deep" />
                            <span className="text-sm font-medium text-on-surface">{a.nome}</span>
                            <Selo id={a.id} />
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
                  <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Nenhum árbitro disponível para este jogo.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
