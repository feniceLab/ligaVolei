'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, CheckCircle2, Undo2, DollarSign, Wallet } from 'lucide-react'

export type EscFin = {
  id: string
  valor: number | null
  pago: boolean
  pago_em: string | null
  arbitro_id: string
  arbitro_nome: string
  data: string
  mandante: string
  visitante: string
  competicao: string
}

type Grupo = {
  arbitro_id: string
  nome: string
  aReceber: number
  jaPago: number
  itens: EscFin[]
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FinanceiroClient({ escalacoes }: { escalacoes: EscFin[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Agrupa por árbitro
  const mapa = new Map<string, Grupo>()
  for (const e of escalacoes) {
    if (!mapa.has(e.arbitro_id)) {
      mapa.set(e.arbitro_id, { arbitro_id: e.arbitro_id, nome: e.arbitro_nome, aReceber: 0, jaPago: 0, itens: [] })
    }
    const g = mapa.get(e.arbitro_id)!
    g.itens.push(e)
    const v = Number(e.valor ?? 0)
    if (e.pago) g.jaPago += v
    else g.aReceber += v
  }
  const grupos = [...mapa.values()].sort((a, b) => b.aReceber - a.aReceber)

  const totalAReceber = grupos.reduce((s, g) => s + g.aReceber, 0)
  const totalPago = grupos.reduce((s, g) => s + g.jaPago, 0)

  async function pagar(ids: string[], pago: boolean) {
    if (!ids.length) return
    setLoading(true)
    const res = await fetch('/api/escalacao/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalacao_ids: ids, pago }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Erro ao atualizar pagamento')
      return
    }
    const d = await res.json().catch(() => ({}))
    toast.success(pago
      ? `${d.count} jogo(s) marcado(s) como pago — ${brl(Number(d.total ?? 0))}`
      : 'Pagamento revertido')
    router.refresh()
  }

  if (!escalacoes.length) {
    return <p className="py-8 text-center text-sm text-on-surface-variant">Nenhuma escalação confirmada ainda. Os valores aparecem aqui quando os árbitros confirmarem os jogos.</p>
  }

  return (
    <div className="space-y-6">
      {/* Totais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-6 shadow-editorial">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <Wallet className="h-4 w-4 text-brand-orange-deep" /> Total a pagar
          </p>
          <p className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-brand-orange-deep">{brl(totalAReceber)}</p>
        </div>
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Já pago
          </p>
          <p className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-green-700">{brl(totalPago)}</p>
        </div>
      </div>

      {/* Por árbitro */}
      <div className="space-y-3">
        {grupos.map((g) => {
          const isOpen = aberto === g.arbitro_id
          const pendentes = g.itens.filter(i => !i.pago)
          return (
            <div key={g.arbitro_id} className="overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
              <div
                className="flex cursor-pointer items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-container-high"
                onClick={() => setAberto(isOpen ? null : g.arbitro_id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-headline text-lg font-bold text-primary">{g.nome}</p>
                  <p className="text-xs text-on-surface-variant">
                    {g.itens.length} jogo(s){g.jaPago > 0 && ` · ${brl(g.jaPago)} pago`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {g.aReceber > 0
                    ? <span className="rounded-full bg-brand-orange/15 px-3 py-1 text-sm font-bold text-brand-orange-deep">{brl(g.aReceber)}</span>
                    : <span className="rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">Quitado</span>
                  }
                  {isOpen ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
                </div>
              </div>

              {isOpen && (
                <div className="space-y-2 border-t border-outline-variant/10 p-4 sm:p-6">
                  {pendentes.length > 0 && (
                    <div className="mb-3 flex justify-end">
                      <Button size="sm" disabled={loading} onClick={() => pagar(pendentes.map(i => i.id), true)}>
                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                        Marcar tudo pago ({brl(g.aReceber)})
                      </Button>
                    </div>
                  )}
                  {g.itens.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-on-surface">{i.mandante} × {i.visitante}</p>
                        <p className="text-xs text-on-surface-variant">
                          {i.data ? new Date(i.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} · {i.competicao}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${i.pago ? 'text-green-700' : 'text-brand-orange-deep'}`}>{brl(Number(i.valor ?? 0))}</span>
                        {i.pago ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-on-surface-variant" disabled={loading} onClick={() => pagar([i.id], false)}>
                            <Undo2 className="mr-1 h-3 w-3" /> Reverter
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={loading} onClick={() => pagar([i.id], true)}>
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
