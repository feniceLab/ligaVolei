'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="text-center py-16">
        <p className="text-muted-foreground">Nenhum jogo agendado no momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Disponível</span>
        <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-500" /> Indisponível</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-yellow-500" /> Aguardando resposta</span>
        <span className="flex items-center gap-1"><Badge className="h-4 bg-blue-600 text-[10px]">Escalado</Badge> Você foi escalado</span>
      </div>

      {Array.from(jogosPorData.entries()).map(([data, jogosNoDia]) => (
        <div key={data}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <div className="space-y-2">
            {jogosNoDia.map((jogo) => {
              const disp = dispState.get(jogo.id)
              const escalado = escalacoesSet.has(jogo.id)
              const isLoading = loading === jogo.id

              return (
                <Card key={jogo.id} className={
                  escalado ? 'border-blue-500/40 bg-blue-500/5' :
                  disp === true ? 'border-green-500/40 bg-green-500/5' :
                  disp === false ? 'border-red-500/20 opacity-70' : ''
                }>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-sm">{jogo.mandante} × {jogo.visitante}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{jogo.horario?.slice(0, 5)}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{jogo.local}</span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> {jogo.competicao?.nome}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {escalado ? (
                          <Badge className="bg-blue-600">Escalado ✓</Badge>
                        ) : disp === true ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : disp === false ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>

                    {!escalado && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant={disp === true ? 'default' : 'outline'}
                          className={disp === true ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                          disabled={isLoading}
                          onClick={() => marcarDisponibilidade(jogo.id, true)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Disponível
                        </Button>
                        <Button
                          size="sm"
                          variant={disp === false ? 'destructive' : 'outline'}
                          className="flex-1"
                          disabled={isLoading}
                          onClick={() => marcarDisponibilidade(jogo.id, false)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Indisponível
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
