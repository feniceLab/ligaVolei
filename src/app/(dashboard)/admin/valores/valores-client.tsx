'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, DollarSign } from 'lucide-react'

interface Competicao { id: string; nome: string; temporada: string }
interface Valor { id: string; competicao_id: string; categoria: string; valor: number }

interface Props {
  competicoes: Competicao[]
  categorias: string[]
  valores: Valor[]
}

export default function ValoresClient({ competicoes, categorias, valores }: Props) {
  const router = useRouter()
  const [competicaoId, setCompeticaoId] = useState(competicoes[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  // Estado editável: categoria -> valor (string, pra permitir campo vazio)
  const valorInicial = (cat: string) => {
    const v = valores.find(x => x.competicao_id === competicaoId && x.categoria === cat)
    return v ? String(v.valor) : ''
  }
  const [rascunho, setRascunho] = useState<Record<string, string>>(() =>
    Object.fromEntries(categorias.map(c => [c, valorInicial(c)])),
  )

  function trocarCompeticao(id: string) {
    setCompeticaoId(id)
    setRascunho(Object.fromEntries(categorias.map(c => {
      const v = valores.find(x => x.competicao_id === id && x.categoria === c)
      return [c, v ? String(v.valor) : '']
    })))
  }

  async function salvar() {
    if (!competicaoId) return
    setSaving(true)
    const supabase = createClient()

    const rows = categorias
      .filter(c => rascunho[c] !== '' && rascunho[c] != null)
      .map(c => ({ competicao_id: competicaoId, categoria: c, valor: Number(rascunho[c]) }))
      .filter(r => !Number.isNaN(r.valor))

    if (!rows.length) {
      toast.error('Preencha ao menos um valor.')
      setSaving(false)
      return
    }

    // upsert respeita o unique(competicao_id, categoria)
    const { error } = await supabase
      .from('competicao_valores')
      .upsert(rows, { onConflict: 'competicao_id,categoria' })

    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
      return
    }
    toast.success('Tabela de valores salva!')
    router.refresh()
  }

  const compNome = competicoes.find(c => c.id === competicaoId)?.nome ?? ''

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="border-b border-outline-variant/10 px-6 py-4">
          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Competição</Label>
          <div className="mt-2 max-w-md">
            <Select value={competicaoId} onValueChange={trocarCompeticao}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {competicoes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} — {c.temporada}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {!competicaoId ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Selecione uma competição.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-on-surface-variant">
                Valores por jogo — <span className="font-bold text-primary">{compNome}</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {categorias.map(cat => (
                  <div key={cat} className="flex items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface">
                        {cat === 'PADRAO' ? 'PADRÃO (base)' : cat}
                      </p>
                      {cat === 'PADRAO' && (
                        <p className="text-[11px] text-on-surface-variant">usado quando a categoria não tem valor próprio</p>
                      )}
                    </div>
                    <div className="relative w-32 shrink-0">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">R$</span>
                      <Input
                        type="number" min="0" step="0.01" inputMode="decimal"
                        className="pl-8 text-right"
                        placeholder="0,00"
                        value={rascunho[cat] ?? ''}
                        onChange={e => setRascunho(r => ({ ...r, [cat]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={salvar} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Salvando...' : 'Salvar tabela'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-4 py-3 text-xs text-on-surface-variant">
        <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange-deep" />
        <p>O valor é <strong>congelado no momento da escalação</strong>. Alterar a tabela aqui não muda escalações já feitas — só vale para as próximas.</p>
      </div>
    </div>
  )
}
