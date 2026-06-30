'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, MapPin, Trophy } from 'lucide-react'

import type { Jogo, Competicao } from '@/types'

type JogoCalendario = Jogo & { competicao: Competicao | null }

interface Props {
  jogos: JogoCalendario[]
  disponibilidades: { jogo_id: string; disponivel: boolean }[]
  escalacoes: { jogo_id: string }[]
  arbitroId: string
}

export default function CalendarioClient({ jogos, disponibilidades, escalacoes, arbitroId }: Props) {
  // Estado local das disponibilidades para UI otimista
  const [dispState, setDispState] = useState<Map<string, boolean | null>>(() => {
    const m = new Map<string, boolean | null>()
    disponibilidades.forEach(d => m.set(d.jogo_id, d.disponivel))
    return m
  })
  const [loading, setLoading] = useState<string | null>(null)
  const escalacoesSet = new Set(escalacoes.map(e => e.jogo_id))

  async function marcarDisponibilidade(jogoId: string, disponivel: boolean) {
    setLoading(jogoId)
    const anterior = dispState.get(jogoId)

    // Otimista
    setDispState(m => new Map(m).set(jogoId, disponivel))

    const supabase = createClient()
    const { error } = await supabase
      .from('disponibilidades')
      .upsert({ arbitro_id: arbitroId, jogo_id: jogoId, disponivel }, { onConflict: 'arbitro_id,jogo_id' })

    if (error) {
      // Reverte
      setDispState(m => new Map(m).set(jogoId, anterior ?? null))
      toast.error('Erro ao salvar disponibilidade')
    } else {
      toast.success(disponivel ? '✅ Disponível confirmado!' : '❌ Indisponibilidade registrada')
    }
    setLoading(null)
  }

  // Agrupa jogos por data
  const jogosPorData = new Map<string, JogoCalendario[]>()
  jogos.forEach(j => {
    if (!jogosPorData.has(j.data)) jogosPorData.set(j.data, [])
    jogosPorData.get(j.data)!.push(j)
  })

  if (jogos.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-on-surface-variant">
        Nenhum jogo agendado no momento.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legenda */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-4 py-3 text-xs text-on-surface-variant shadow-editorial">
        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Disponível</span>
        <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-brand-orange-deep" /> Indisponível</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-orange-deep" /> Aguardando resposta</span>
        <span className="flex items-center gap-1.5"><Badge className="h-4 bg-blue-600 text-[10px]">Escalado</Badge> Você foi escalado</span>
      </div>

      {Array.from(jogosPorData.entries()).map(([data, jogosNoDia]) => (
        <div key={data}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">
            {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="space-y-3">
            {jogosNoDia.map((jogo) => {
              const disp = dispState.get(jogo.id)
              const escalado = escalacoesSet.has(jogo.id)
              const isLoading = loading === jogo.id

              return (
                <div
                  key={jogo.id}
                  className={`rounded-2xl border p-4 shadow-editorial ${
                    escalado
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : disp === false
                        ? 'border-outline-variant/10 bg-surface-container-lowest opacity-80'
                        : 'border-outline-variant/10 bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-bold text-on-surface">
                        {jogo.mandante} <span className="font-normal text-on-surface-variant">×</span> {jogo.visitante}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                        <span>{jogo.horario?.slice(0, 5)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{jogo.local}</span>
                      </div>
                      <p className="flex items-center gap-1 text-xs font-medium text-on-surface-variant/80">
                        <Trophy className="h-3 w-3" /> {jogo.competicao?.nome}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {escalado ? (
                        <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">Escalado ✓</span>
                      ) : disp === true ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Disponível
                        </span>
                      ) : disp === false ? (
                        <span className="flex items-center gap-1 rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-deep">
                          <XCircle className="h-3.5 w-3.5" /> Indisponível
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-brand-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-orange-deep">
                          <Clock className="h-3.5 w-3.5" /> Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  {!escalado && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => marcarDisponibilidade(jogo.id, true)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                          disp === true
                            ? 'bg-primary text-white'
                            : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Disponível
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => marcarDisponibilidade(jogo.id, false)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                          disp === false
                            ? 'bg-brand-orange/15 text-brand-orange-deep'
                            : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        Indisponível
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
