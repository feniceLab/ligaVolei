'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, MapPin, Trophy, CheckCheck } from 'lucide-react'

export type JogoCal = {
  id: string; data: string; horario: string; mandante: string; visitante: string
  local: string; competicao_nome: string
}

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Props {
  jogos: JogoCal[]
  dispInicial: Record<string, boolean>   // jogo_id -> disponivel
  escaladoIds?: string[]
  arbitroId: string
  editable?: boolean
}

export default function CalendarioGrade({ jogos, dispInicial, escaladoIds = [], arbitroId, editable = true }: Props) {
  const supabase = createClient()
  const escalados = useMemo(() => new Set(escaladoIds), [escaladoIds])
  const [disp, setDisp] = useState<Record<string, boolean>>(dispInicial)
  const [loading, setLoading] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)   // dia do modal

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

  const totalMarcados = useMemo(() => Object.values(disp).filter(Boolean).length, [disp])

  async function marcar(jogoId: string, disponivel: boolean) {
    setLoading(jogoId)
    const anterior = disp[jogoId]
    setDisp(s => ({ ...s, [jogoId]: disponivel }))
    const { error } = await supabase.from('disponibilidades')
      .upsert({ arbitro_id: arbitroId, jogo_id: jogoId, disponivel }, { onConflict: 'arbitro_id,jogo_id' })
    setLoading(null)
    if (error) { setDisp(s => ({ ...s, [jogoId]: anterior })); toast.error('Erro ao salvar') }
  }

  async function marcarTodos(dia: string, disponivel: boolean) {
    const alvos = (jogosPorDia.get(dia) ?? []).filter(j => !escalados.has(j.id))
    if (!alvos.length) return
    setLoading('todos')
    setDisp(s => { const n = { ...s }; alvos.forEach(j => { n[j.id] = disponivel }); return n })
    const rows = alvos.map(j => ({ arbitro_id: arbitroId, jogo_id: j.id, disponivel }))
    const { error } = await supabase.from('disponibilidades').upsert(rows, { onConflict: 'arbitro_id,jogo_id' })
    setLoading(null)
    if (error) return toast.error('Erro ao salvar')
    toast.success(disponivel ? `${alvos.length} jogos marcados como disponível` : `${alvos.length} jogos marcados como indisponível`)
  }

  // grade do mês
  const primeiroDia = new Date(ref.ano, ref.mes, 1)
  const offset = primeiroDia.getDay()
  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate()
  const celulas: (string | null)[] = []
  for (let i = 0; i < offset; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++)
    celulas.push(`${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  const nomeMes = primeiroDia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const navMes = (delta: number) => setRef(r => { const d = new Date(r.ano, r.mes + delta, 1); return { ano: d.getFullYear(), mes: d.getMonth() } })
  const hojeKey = new Date().toISOString().slice(0, 10)

  const jogosModal = aberto ? (jogosPorDia.get(aberto) ?? []) : []
  const marcadosModal = jogosModal.filter(j => disp[j.id] === true).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-editorial sm:p-6">
        {/* Header mês + resumo */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navMes(-1)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"><ChevronLeft className="h-5 w-5" /></button>
          <div className="text-center">
            <p className="font-headline text-base font-bold capitalize text-primary">{nomeMes}</p>
            <p className="text-[11px] text-on-surface-variant">{jogos.length} jogos · <span className="font-bold text-green-700">{totalMarcados} disponível</span></p>
          </div>
          <button onClick={() => navMes(1)} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high"><ChevronRight className="h-5 w-5" /></button>
        </div>

        {/* Grade */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {SEMANA.map(s => <div key={s} className="pb-1 text-[10px] font-bold uppercase text-on-surface-variant/70">{s}</div>)}
          {celulas.map((key, i) => {
            if (!key) return <div key={i} />
            const dia = Number(key.slice(-2))
            const doDia = jogosPorDia.get(key) ?? []
            const temJogo = doDia.length > 0
            const marcados = doDia.filter(j => disp[j.id] === true).length
            const escaladoDia = doDia.some(j => escalados.has(j.id))
            const hoje = key === hojeKey
            return (
              <button key={key} onClick={() => temJogo && setAberto(key)} disabled={!temJogo}
                className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors
                  ${temJogo ? 'bg-surface-container-high text-on-surface hover:bg-primary hover:text-white' : 'text-on-surface-variant/40'}
                  ${hoje ? 'ring-2 ring-brand-orange' : ''}`}>
                <span className={hoje ? 'font-extrabold' : 'font-medium'}>{dia}</span>
                {temJogo && (
                  <span className="flex items-center gap-1 text-[9px] font-bold">
                    {escaladoDia && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" title="escalado" />}
                    {marcados > 0
                      ? <span className="rounded-full bg-green-600/15 px-1 text-green-700">{marcados}✓</span>
                      : <span className="rounded-full bg-brand-orange/15 px-1 text-brand-orange-deep">{doDia.length}</span>}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-on-surface-variant">
          <span className="flex items-center gap-1"><span className="rounded-full bg-brand-orange/15 px-1 text-brand-orange-deep">N</span> nº de jogos no dia</span>
          <span className="flex items-center gap-1"><span className="rounded-full bg-green-600/15 px-1 text-green-700">N✓</span> você marcou disponível</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> escalado</span>
        </div>
      </div>

      {/* MODAL do dia */}
      <Dialog open={!!aberto} onOpenChange={o => !o && setAberto(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-outline-variant/10 px-5 py-4">
            <DialogTitle className="capitalize">
              {aberto ? new Date(aberto + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </DialogTitle>
            <p className="text-xs text-on-surface-variant">{jogosModal.length} jogos · <span className="font-bold text-green-700">{marcadosModal} disponível</span></p>
          </DialogHeader>

          {editable && (
            <div className="flex gap-2 border-b border-outline-variant/10 px-5 py-3">
              <Button size="sm" variant="outline" className="flex-1" disabled={loading === 'todos'} onClick={() => aberto && marcarTodos(aberto, true)}>
                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Todos disponível
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" disabled={loading === 'todos'} onClick={() => aberto && marcarTodos(aberto, false)}>
                Todos não
              </Button>
            </div>
          )}

          <div className="space-y-2 overflow-y-auto p-5">
            {jogosModal.map(j => {
              const escalado = escalados.has(j.id)
              const st = disp[j.id]
              return (
                <div key={j.id} className={`rounded-xl border p-3 ${st === true ? 'border-green-600/30 bg-green-600/5' : 'border-outline-variant/10 bg-surface'}`}>
                  <p className="text-sm font-bold text-on-surface">{j.mandante} × {j.visitante}</p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
                    <span className="font-bold text-primary">{j.horario?.slice(0, 5)}</span>
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
                      {st === true ? 'Disponível' : st === false ? 'Indisponível' : 'Sem resposta'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
