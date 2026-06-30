'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trophy } from 'lucide-react'
import type { Competicao } from '@/types'

const emptyForm = { nome: '', categoria: '', temporada: new Date().getFullYear().toString(), data_inicio: '', data_fim: '' }

export default function CompeticoesClient({ competicoes }: { competicoes: Competicao[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Competicao | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)

  function f(key: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function abrirNovo() {
    setEditando(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function abrirEditar(c: Competicao) {
    setEditando(c)
    setForm({ nome: c.nome, categoria: c.categoria, temporada: c.temporada, data_inicio: c.data_inicio, data_fim: c.data_fim })
    setOpen(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const payload = { ...form }
    const { error } = editando
      ? await supabase.from('competicoes').update(payload).eq('id', editando.id)
      : await supabase.from('competicoes').insert(payload)

    if (error) toast.error('Erro: ' + error.message)
    else { toast.success(editando ? 'Competição atualizada!' : 'Competição criada!'); setOpen(false) }

    setLoading(false)
    router.refresh()
  }

  async function toggleAtivo(c: Competicao) {
    const supabase = createClient()
    const { error } = await supabase.from('competicoes').update({ ativo: !c.ativo }).eq('id', c.id)
    if (error) toast.error('Erro ao atualizar')
    else toast.success(c.ativo ? 'Competição desativada' : 'Competição ativada')
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-navy-deep to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Nova Competição
        </button>
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Competições Cadastradas</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{competicoes.length}</span>
        </div>
        <div className="p-4 sm:p-6">
          {competicoes.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhuma competição cadastrada.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {competicoes.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-xl border border-outline-variant/10 bg-surface p-4 transition-colors hover:bg-surface-container-high ${!c.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 shrink-0 text-brand-orange-deep" />
                        <p className="font-bold leading-tight text-on-surface">{c.nome}</p>
                      </div>
                      <span
                        className={
                          c.ativo
                            ? 'shrink-0 rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700'
                            : 'shrink-0 rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant'
                        }
                      >
                        {c.ativo ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-on-surface-variant">
                      <span>{c.categoria}</span>
                      <span>·</span>
                      <span>Temporada {c.temporada}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(c.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} até{' '}
                      {new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => abrirEditar(c)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleAtivo(c)}>
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Competição' : 'Nova Competição'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={f('nome')} placeholder="Ex: Campeonato Catarinense 2026" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Input value={form.categoria} onChange={f('categoria')} placeholder="Masculino, Feminino..." required />
              </div>
              <div className="space-y-2">
                <Label>Temporada *</Label>
                <Input value={form.temporada} onChange={f('temporada')} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={f('data_inicio')} required />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input type="date" value={form.data_fim} onChange={f('data_fim')} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
