'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
        <Button onClick={abrirNovo}><Plus className="mr-2 h-4 w-4" /> Nova Competição</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {competicoes.map((c) => (
          <Card key={c.id} className={!c.ativo ? 'opacity-60' : ''}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
                  <p className="font-medium leading-tight">{c.nome}</p>
                </div>
                <Badge variant={c.ativo ? 'default' : 'outline'} className="shrink-0">
                  {c.ativo ? 'Ativa' : 'Encerrada'}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{c.categoria}</span>
                <span>·</span>
                <span>Temporada {c.temporada}</span>
              </div>
              <p className="text-xs text-muted-foreground">
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
            </CardContent>
          </Card>
        ))}
        {competicoes.length === 0 && (
          <p className="text-muted-foreground col-span-2 text-sm py-8 text-center">Nenhuma competição cadastrada.</p>
        )}
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
