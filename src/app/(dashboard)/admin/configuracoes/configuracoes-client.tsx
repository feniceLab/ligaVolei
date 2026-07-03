'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Save, DollarSign, CalendarClock, SlidersHorizontal, Info } from 'lucide-react'
import type { ValorFuncao, ValorEtapa, FuncaoArbitragem } from '@/types'
import { FUNCAO_LABEL } from '@/types'

// ordem hierárquica das categorias de árbitro
const CATS = ['Internacional', 'Especial', 'Nacional', 'Aspirante a Nacional', 'Regional', 'Iniciante']
const FUNCOES_MATRIZ: FuncaoArbitragem[] = ['arbitro', 'juiz_linha', 'apontador']

type Competicao = { id: string; nome: string; temporada: string; regime: 'por_jogo' | 'por_etapa'; categoria_etaria: string | null }

interface Props {
  valoresFuncao: ValorFuncao[]
  valoresEtapa: ValorEtapa[]
  config: Record<string, string>
  competicoes: Competicao[]
  catsEtarias: string[]
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ConfiguracoesClient({ valoresFuncao, valoresEtapa, config, competicoes, catsEtarias }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'jogo' | 'etapa' | 'regime'>('jogo')
  const [catEtaria, setCatEtaria] = useState(catsEtarias[0] ?? 'Adulto')
  const [saving, setSaving] = useState(false)

  const buildFuncao = useCallback((cat: string): Record<string, string> => {
    const d: Record<string, string> = {}
    for (const f of FUNCOES_MATRIZ) for (const c of CATS) {
      const row = valoresFuncao.find(v => v.categoria_etaria === cat && v.funcao === f && v.categoria_arbitro === c)
      d[`${f}::${c}`] = row ? String(row.valor) : ''
    }
    const del = valoresFuncao.find(v => v.categoria_etaria === cat && v.funcao === 'delegado' && v.categoria_arbitro === 'Único')
    d['delegado::Único'] = del ? String(del.valor) : ''
    return d
  }, [valoresFuncao])

  const buildEtapa = useCallback((cat: string): Record<string, string> => {
    const d: Record<string, string> = {}
    for (const c of CATS) {
      const row = valoresEtapa.find(v => v.categoria_etaria === cat && v.categoria_arbitro === c)
      d[c] = row ? String(row.valor) : ''
    }
    return d
  }, [valoresEtapa])

  const [draftFuncao, setDraftFuncao] = useState<Record<string, string>>(() => buildFuncao(catEtaria))
  const [draftEtapa, setDraftEtapa] = useState<Record<string, string>>(() => buildEtapa(catEtaria))
  const [inss, setInss] = useState(config.desconto_inss ?? '11')
  const [iss, setIss] = useState(config.desconto_iss ?? '2')
  const [dia1, setDia1] = useState(config.pgto_1a_quinzena ?? '15')
  const [dia2, setDia2] = useState(config.pgto_2a_quinzena ?? '30/31')

  useEffect(() => {
    setDraftFuncao(buildFuncao(catEtaria))
    setDraftEtapa(buildEtapa(catEtaria))
  }, [catEtaria, buildFuncao, buildEtapa])

  const descontoTotal = (Number(inss) || 0) + (Number(iss) || 0)

  async function salvarPorJogo() {
    setSaving(true)
    const supabase = createClient()
    const rows: { categoria_etaria: string; funcao: string; categoria_arbitro: string; valor: number }[] = []
    for (const f of FUNCOES_MATRIZ) for (const c of CATS) {
      const raw = draftFuncao[`${f}::${c}`]
      if (raw !== '' && raw != null && !Number.isNaN(Number(raw)))
        rows.push({ categoria_etaria: catEtaria, funcao: f, categoria_arbitro: c, valor: Number(raw) })
    }
    const del = draftFuncao['delegado::Único']
    if (del !== '' && del != null && !Number.isNaN(Number(del)))
      rows.push({ categoria_etaria: catEtaria, funcao: 'delegado', categoria_arbitro: 'Único', valor: Number(del) })

    const { error } = await supabase.from('valores_funcao').upsert(rows, { onConflict: 'categoria_etaria,funcao,categoria_arbitro' })
    setSaving(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success(`Valores por jogo (${catEtaria}) salvos!`)
    router.refresh()
  }

  async function salvarPorEtapa() {
    setSaving(true)
    const supabase = createClient()
    const rows = CATS
      .filter(c => draftEtapa[c] !== '' && draftEtapa[c] != null && !Number.isNaN(Number(draftEtapa[c])))
      .map(c => ({ categoria_etaria: catEtaria, categoria_arbitro: c, valor: Number(draftEtapa[c]) }))

    const confRows = [
      { chave: 'desconto_inss', valor: String(inss) },
      { chave: 'desconto_iss', valor: String(iss) },
      { chave: 'pgto_1a_quinzena', valor: String(dia1) },
      { chave: 'pgto_2a_quinzena', valor: String(dia2) },
    ]

    const [r1, r2] = await Promise.all([
      supabase.from('valores_etapa').upsert(rows, { onConflict: 'categoria_etaria,categoria_arbitro' }),
      supabase.from('configuracoes').upsert(confRows, { onConflict: 'chave' }),
    ])
    setSaving(false)
    if (r1.error || r2.error) return toast.error('Erro ao salvar: ' + (r1.error?.message || r2.error?.message))
    toast.success(`Valores por etapa (${catEtaria}) e descontos salvos!`)
    router.refresh()
  }

  async function mudarCompeticao(id: string, campo: 'regime' | 'categoria_etaria', valor: string) {
    const supabase = createClient()
    const { error } = await supabase.from('competicoes').update({ [campo]: valor }).eq('id', id)
    if (error) return toast.error('Erro ao salvar')
    toast.success('Competição atualizada')
    router.refresh()
  }

  const tabs = [
    { id: 'jogo' as const, label: 'Valores por jogo', icon: DollarSign },
    { id: 'etapa' as const, label: 'Valores por etapa', icon: CalendarClock },
    { id: 'regime' as const, label: 'Regime das competições', icon: SlidersHorizontal },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/10 pb-1">
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                active ? 'bg-surface-container-lowest text-primary shadow-editorial' : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Seletor de categoria etária (abas de valores) */}
      {tab !== 'regime' && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Categoria etária</span>
          <select
            value={catEtaria}
            onChange={e => setCatEtaria(e.target.value)}
            className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {catsEtarias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[11px] text-on-surface-variant/70">só &quot;Adulto&quot; tem valores hoje; base fica em branco até a liga enviar</span>
        </div>
      )}

      {/* ABA 1 — Valores por jogo (função × categoria) */}
      {tab === 'jogo' && (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10 text-left">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Categoria</th>
                  {FUNCOES_MATRIZ.map(f => (
                    <th key={f} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{FUNCAO_LABEL[f]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATS.map(cat => (
                  <tr key={cat} className="border-b border-outline-variant/5">
                    <td className="whitespace-nowrap px-4 py-2 font-bold text-on-surface">{cat}</td>
                    {FUNCOES_MATRIZ.map(f => (
                      <td key={f} className="px-4 py-2">
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">R$</span>
                          <Input
                            type="number" min="0" step="0.01" inputMode="decimal"
                            className="pl-7 text-right" placeholder="—"
                            value={draftFuncao[`${f}::${cat}`] ?? ''}
                            onChange={e => setDraftFuncao(d => ({ ...d, [`${f}::${cat}`]: e.target.value }))}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-primary">Delegado Técnico</td>
                  <td className="px-4 py-3" colSpan={FUNCOES_MATRIZ.length}>
                    <div className="relative w-28">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">R$</span>
                      <Input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="pl-7 text-right" placeholder="—"
                        value={draftFuncao['delegado::Único'] ?? ''}
                        onChange={e => setDraftFuncao(d => ({ ...d, 'delegado::Único': e.target.value }))}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarPorJogo} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar valores por jogo'}
            </Button>
          </div>
        </div>
      )}

      {/* ABA 2 — Valores por etapa + descontos */}
      {tab === 'etapa' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-editorial sm:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Valor por etapa (bloco de até 6 jogos)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATS.map(cat => {
                const bruto = Number(draftEtapa[cat]) || 0
                const liquido = bruto * (1 - descontoTotal / 100)
                return (
                  <div key={cat} className="flex items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface">{cat}</p>
                      {bruto > 0 && <p className="text-[11px] text-on-surface-variant">líquido ≈ {brl(liquido)}</p>}
                    </div>
                    <div className="relative w-32 shrink-0">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">R$</span>
                      <Input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="pl-8 text-right" placeholder="0,00"
                        value={draftEtapa[cat] ?? ''}
                        onChange={e => setDraftEtapa(d => ({ ...d, [cat]: e.target.value }))}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-4 shadow-editorial sm:p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Descontos e pagamento</p>
            <div className="grid gap-4 sm:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface-variant">INSS (%)</span>
                <Input type="number" min="0" step="0.01" value={inss} onChange={e => setInss(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface-variant">ISS (%)</span>
                <Input type="number" min="0" step="0.01" value={iss} onChange={e => setIss(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface-variant">Pgto 1ª quinzena (dia)</span>
                <Input value={dia1} onChange={e => setDia1(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold text-on-surface-variant">Pgto 2ª quinzena (dia)</span>
                <Input value={dia2} onChange={e => setDia2(e.target.value)} />
              </label>
            </div>
            <p className="mt-3 text-[11px] text-on-surface-variant">Desconto total sobre o bruto: <strong>{descontoTotal}%</strong> (aplicado no financeiro).</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={salvarPorEtapa} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar valores por etapa'}
            </Button>
          </div>
        </div>
      )}

      {/* ABA 3 — Regime das competições */}
      {tab === 'regime' && (
        <div className="space-y-3">
          {competicoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhuma competição cadastrada.</p>
          ) : competicoes.map(c => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest px-5 py-4 shadow-editorial">
              <div className="min-w-0">
                <p className="truncate font-bold text-primary">{c.nome}</p>
                <p className="text-xs text-on-surface-variant">{c.temporada}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={c.categoria_etaria ?? 'Adulto'}
                  onChange={e => mudarCompeticao(c.id, 'categoria_etaria', e.target.value)}
                  className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  title="Categoria etária"
                >
                  {catsEtarias.map(ce => <option key={ce} value={ce}>{ce}</option>)}
                </select>
                <select
                  value={c.regime}
                  onChange={e => mudarCompeticao(c.id, 'regime', e.target.value)}
                  className="rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  title="Regime de pagamento"
                >
                  <option value="por_jogo">Por jogo</option>
                  <option value="por_etapa">Por etapa</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-4 py-3 text-xs text-on-surface-variant">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange-deep" />
        <p>O valor é <strong>congelado no momento da escalação</strong> (conforme o regime da competição e a função do árbitro). Alterar as tabelas aqui só vale para as <strong>próximas</strong> escalações.</p>
      </div>
    </div>
  )
}
