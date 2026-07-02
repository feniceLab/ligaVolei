'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { EscalacaoStatus } from '@/types'

type Item = {
  id: string
  status: EscalacaoStatus
  valor: number | null
  motivo_recusa: string | null
  jogo: {
    data: string
    horario: string
    local: string
    mandante: string
    visitante: string
    competicao: { nome: string } | null
  } | null
}

function brl(v: number | null) {
  if (v == null) return null
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ArbitroEscalacoes({ escalacoes }: { escalacoes: Item[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function responder(id: string, acao: 'confirmada' | 'recusada') {
    let motivo: string | null = null
    if (acao === 'recusada') {
      motivo = window.prompt('Motivo da recusa (opcional):') ?? ''
    }
    setLoading(id)
    const res = await fetch('/api/escalacao/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalacao_id: id, acao, motivo }),
    })
    setLoading(null)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || 'Erro ao responder')
      return
    }
    toast.success(acao === 'confirmada' ? 'Escalação confirmada!' : 'Escalação recusada')
    router.refresh()
  }

  if (!escalacoes.length) {
    return <p className="py-8 text-center text-sm text-on-surface-variant">Você não tem escalações no momento.</p>
  }

  return (
    <div className="space-y-3">
      {escalacoes.map((esc) => {
        const jogo = esc.jogo
        if (!jogo) return null
        return (
          <div key={esc.id} className="rounded-xl border border-outline-variant/10 bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-bold text-on-surface">
                  {jogo.mandante} <span className="font-normal text-on-surface-variant">×</span> {jogo.visitante}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {jogo.horario?.slice(0, 5)} — {jogo.local}
                </p>
                <p className="text-xs font-medium text-on-surface-variant/80">
                  {jogo.competicao?.nome}
                  {esc.valor != null && <span className="ml-2 font-bold text-brand-orange-deep">{brl(esc.valor)}</span>}
                </p>
              </div>

              {esc.status === 'confirmada' && (
                <span className="shrink-0 rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700">Confirmado</span>
              )}
              {esc.status === 'recusada' && (
                <span className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive">Recusado</span>
              )}
            </div>

            {esc.status === 'pendente' && (
              <div className="mt-3 flex gap-2 border-t border-outline-variant/10 pt-3">
                <button
                  disabled={loading === esc.id}
                  onClick={() => responder(esc.id, 'confirmada')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-transform hover:scale-[0.99] disabled:opacity-60"
                >
                  <CheckCircle2 size={16} /> Confirmar
                </button>
                <button
                  disabled={loading === esc.id}
                  onClick={() => responder(esc.id, 'recusada')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant/40 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  <XCircle size={16} /> Recusar
                </button>
              </div>
            )}

            {esc.status === 'recusada' && esc.motivo_recusa && (
              <p className="mt-2 text-xs text-on-surface-variant">Motivo: {esc.motivo_recusa}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
