'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Wallet, CheckCircle2, Coins, Hash } from 'lucide-react'
import { Donut, HBarList, BarsVertical } from '@/components/charts'
import { FUNCAO_LABEL, type FuncaoArbitragem } from '@/types'

export type BiRow = {
  arbitro_nome: string; categoria: string | null; funcao: FuncaoArbitragem
  valor: number | null; pago: boolean; data: string; competicao: string
  mandante: string; visitante: string
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brlK = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const PERIODOS = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'mes', label: 'Este mês' },
  { id: '3meses', label: '90 dias' },
  { id: 'ano', label: 'Este ano' },
] as const
type PeriodoId = typeof PERIODOS[number]['id']

export default function FinanceiroBI({ rows, descontoPct }: { rows: BiRow[]; descontoPct: number }) {
  const [periodo, setPeriodo] = useState<PeriodoId>('tudo')

  const dados = useMemo(() => {
    const hoje = new Date()
    const inicio = new Date(hoje)
    if (periodo === 'mes') inicio.setDate(1)
    else if (periodo === '3meses') inicio.setDate(hoje.getDate() - 90)
    else if (periodo === 'ano') { inicio.setMonth(0); inicio.setDate(1) }
    const filtro = (d: string) => periodo === 'tudo' || (d && new Date(d + 'T00:00:00') >= inicio)
    return rows.filter(r => filtro(r.data)).map(r => ({ ...r, v: Number(r.valor ?? 0) }))
  }, [rows, periodo])

  const agg = useMemo(() => {
    const soma = (arr: typeof dados) => arr.reduce((s, r) => s + r.v, 0)
    const total = soma(dados)
    const pago = soma(dados.filter(r => r.pago))
    const aPagar = total - pago

    const porChave = (fn: (r: typeof dados[number]) => string) => {
      const m = new Map<string, number>()
      for (const r of dados) m.set(fn(r), (m.get(fn(r)) ?? 0) + r.v)
      return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
    }

    // por mês (ordenado cronologicamente, últimos 8)
    const mesMap = new Map<string, number>()
    for (const r of dados) {
      if (!r.data) continue
      const key = r.data.slice(0, 7) // YYYY-MM
      mesMap.set(key, (mesMap.get(key) ?? 0) + r.v)
    }
    const porMes = [...mesMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
      .map(([k, value]) => { const [y, m] = k.split('-'); return { label: `${MESES[+m - 1]}/${y.slice(2)}`, value } })

    return {
      total, pago, aPagar, n: dados.length,
      medio: dados.length ? total / dados.length : 0,
      porMes,
      porCompeticao: porChave(r => r.competicao || '—').slice(0, 6),
      porCategoria: porChave(r => r.categoria || '—'),
      porFuncao: porChave(r => FUNCAO_LABEL[r.funcao] ?? r.funcao),
      topArbitros: porChave(r => r.arbitro_nome).slice(0, 8),
      pagoVs: [{ label: 'Já pago', value: pago }, { label: 'A pagar', value: aPagar }],
    }
  }, [dados])

  function exportarCSV() {
    const head = ['Árbitro', 'Categoria', 'Função', 'Jogo', 'Competição', 'Data', 'Valor bruto', 'Valor líquido', 'Status']
    const linhas = dados.map(r => [
      r.arbitro_nome, r.categoria ?? '', FUNCAO_LABEL[r.funcao] ?? r.funcao,
      `${r.mandante} x ${r.visitante}`, r.competicao,
      r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : '',
      r.v.toFixed(2).replace('.', ','),
      (r.v * (1 - descontoPct / 100)).toFixed(2).replace('.', ','),
      r.pago ? 'Pago' : 'A pagar',
    ])
    const csv = [head, ...linhas].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `financeiro-lcv-${periodo}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-5">
      {/* Filtro + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${periodo === p.id ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={exportarCSV} disabled={!dados.length}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Coins} titulo="Custo total" valor={brl(agg.total)} sub={descontoPct > 0 ? `líquido ≈ ${brl(agg.total * (1 - descontoPct / 100))}` : 'bruto no período'} />
        <Kpi icon={Wallet} titulo="A pagar" valor={brl(agg.aPagar)} cor="text-brand-orange-deep" sub="confirmado, não quitado" />
        <Kpi icon={CheckCircle2} titulo="Já pago" valor={brl(agg.pago)} cor="text-green-700" sub="pagamentos quitados" />
        <Kpi icon={Hash} titulo="Escalações" valor={String(agg.n)} sub={`custo médio ${brl(agg.medio)}/jogo`} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Gasto por mês"><BarsVertical data={agg.porMes} unit={brlK} /></Card>
        <Card titulo="Pago × A pagar"><Donut data={agg.pagoVs} unit={brl} /></Card>
        <Card titulo="Custo por competição"><HBarList data={agg.porCompeticao} unit={brl} /></Card>
        <Card titulo="Top árbitros por custo"><HBarList data={agg.topArbitros} unit={brl} color="#fe8933" /></Card>
        <Card titulo="Por categoria"><Donut data={agg.porCategoria} unit={brl} /></Card>
        <Card titulo="Por função"><Donut data={agg.porFuncao} unit={brl} /></Card>
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, titulo, valor, sub, cor }: { icon: typeof Wallet; titulo: string; valor: string; sub: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{titulo}</p>
        <span className="rounded-lg bg-surface-container-high p-1.5 text-primary"><Icon size={15} /></span>
      </div>
      <p className={`mt-2 font-headline text-2xl font-extrabold tracking-tight ${cor ?? 'text-primary'}`}>{valor}</p>
      <p className="mt-1 text-[11px] text-on-surface-variant">{sub}</p>
    </div>
  )
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{titulo}</p>
      {children}
    </div>
  )
}
