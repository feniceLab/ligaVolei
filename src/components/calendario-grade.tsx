'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, MapPin, Trophy } from 'lucide-react'

export type JogoCal = {
  id: string; data: string; horario: string; mandante: string; visitante: string
  local: string; competicao_nome: string
}

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Props {
  jogos: JogoCal[]
  dispInicial: Record<string, boolean>   // jogo_id -> disponivel
  escaladoIds?: string[]                 // jogos onde já foi escalado
  arbitroId: string
  editable?: boolean
}

export default function CalendarioGrade({ jogos, dispInicial, escaladoIds = [], arbitroId, editable = true }: Props) {
  const supabase = createClient()
  const escalados = useMemo(() => new Set(escaladoIds), [escaladoIds])
  const [disp, setDisp] = useState<Record<string, boolean>>(dispInicial)
  const [loading, setLoading] = useState<string | null>(null)

  // mês inicial = do primeiro jogo futuro, ou hoje
  const primeira = jogos[0]?.data
  const [ref, setRef] = useState(() => {
    const d = primeira ? new Date(primeira + 'T00:00:00') : new Date()
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })

  const jogosPorDia = useMemo(() => {
    const m = new Map<string, JogoCal[]>()
    for (const j of jogos) {
      if (!m.has(j.data)) m.set(j.data, [])
      m.get(j.data)!.push(j)
    }
    return m
  }, [jogos])

  const [selecionado, setSelecionado] = useState<string | null>(primeira ?? null)

  async function marcar(jogoId: string, disponivel: boolean) {
    setLoading(jogoId)
    const anterior = disp[jogoId]
    setDisp(s => ({ ...s, [jogoId]: disponivel }))
    const { error } = await supabase.from('disponibilidades')
      .upsert({ arbitro_id: arbitroId, jogo_id: jogoId, disponivel }, { onConflict: 'arbitro_id,jogo_id' })
    setLoading(null)
    if (error) {
      setDisp(s => ({ ...s, [jogoId]: anterior }))
      return toast.error('Erro ao salvar disponibilidade')
    }
    toast.success(disponivel ? 'Disponível ✓' : 'Indisponível registrado')
  }

  // grade do mês
  const primeiroDia = new Date(ref.ano, ref.mes, 1)
  const offset = primeiroDia.getDay()
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate()
  const celulas: (string | null)[] = []
  for (let i = 0; i < offset; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) {
    const key = `${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    celulas.push(key)
  }
  const nomeMes = primeiroDia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const navMes = (delta: number) => setRef(r => {
    const d = new Date(r.ano, r.mes + delta, 1)
    return { ano: d.getFullYear(), mes: d.getMonth() }
  })
  const hojeKey = new Date().toISOString().slice(0, 10)
  const jogosDoDia = selecionado ? (jogosPorDia.get(selecionado) ?? []) : []

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Calendário */}
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-editorial sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => navMes(-1)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"><ChevronLeft className="h-4 w-4" /></button>
          <p className="font-headline text-sm font-bold capitalize text-primary">{nomeMes}</p>
          <button onClick={() => navMes(1)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {SEMANA.map(s => <div key={s} className="pb-1 text-[10px] font-bold uppercase text-on-surface-variant/70">{s}</div>)}
          {celulas.map((key, i) => {
            if (!key) return <div key={i} />
            const dia = Number(key.slice(-2))
            const doDia = jogosPorDia.get(key) ?? []
            const temJogo = doDia.length > 0
            const algumDisp = doDia.some(j => disp[j.id] === true)
            const algumEsc = doDia.some(j => escalados.has(j.id))
            const sel = selecionado === key
            const hoje = key === hojeKey
            return (
              <button key={key} onClick={() => temJogo && setSelecionado(key)} disabled={!temJogo}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors
                  ${sel ? 'bg-primary text-white' : temJogo ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest' : 'text-on-surface-variant/40'}
                  ${hoje && !sel ? 'ring-1 ring-brand-orange' : ''}`}>
                <span className={hoje ? 'font-extrabold' : ''}>{dia}</span>
                {temJogo && (
                  <span className="mt-0.5 flex gap-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${algumEsc ? 'bg-blue-500' : algumDisp ? 'bg-green-500' : sel ? 'bg-white/70' : 'bg-brand-orange'}`} />
                    {doDia.length > 1 && <span className={`text-[8px] ${sel ? 'text-white/80' : 'text-on-surface-variant'}`}>{doDia.length}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-brand-orange" /> tem jogo</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> você marcou disponível</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> escalado</span>
        </div>
      </div>

      {/* Jogos do dia selecionado */}
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-editorial sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {selecionado ? new Date(selecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
        </p>
        {jogosDoDia.length === 0 ? (
          <p className="py-6 text-center text-sm text-on-surface-variant">Nenhum jogo neste dia.</p>
        ) : (
          <div className="space-y-2">
            {jogosDoDia.map(j => {
              const escalado = escalados.has(j.id)
              const st = disp[j.id]
              return (
                <div key={j.id} className="rounded-xl border border-outline-variant/10 bg-surface p-3">
                  <p className="text-sm font-bold text-on-surface">{j.mandante} × {j.visitante}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
                    <span>{j.horario?.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.local}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-on-surface-variant/80"><Trophy className="h-3 w-3" />{j.competicao_nome}</p>
                  {escalado ? (
                    <span className="mt-2 inline-block rounded-full bg-blue-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">Escalado ✓</span>
                  ) : editable ? (
                    <div className="mt-2 flex gap-2">
                      <button disabled={loading === j.id} onClick={() => marcar(j.id, true)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors disabled:opacity-50 ${st === true ? 'bg-primary text-white' : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container-high'}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Disponível
                      </button>
                      <button disabled={loading === j.id} onClick={() => marcar(j.id, false)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition-colors disabled:opacity-50 ${st === false ? 'bg-brand-orange/15 text-brand-orange-deep' : 'border border-outline-variant/20 bg-surface text-on-surface hover:bg-surface-container-high'}`}>
                        <XCircle className="h-3.5 w-3.5" /> Não
                      </button>
                    </div>
                  ) : (
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${st === true ? 'bg-green-600/10 text-green-700' : st === false ? 'bg-brand-orange/15 text-brand-orange-deep' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {st === true ? <><CheckCircle2 className="h-3 w-3" />Disponível</> : st === false ? <><XCircle className="h-3 w-3" />Indisponível</> : <><Clock className="h-3 w-3" />Sem resposta</>}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
