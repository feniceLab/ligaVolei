'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, UserX, UserCheck, Phone } from 'lucide-react'
import type { Profile } from '@/types'
import { useRouter } from 'next/navigation'

export default function ArbitrosClient({ arbitros }: { arbitros: Profile[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', categoria: '', valor_por_jogo: '' })

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', email: '', telefone: '', categoria: '', valor_por_jogo: '' })
    setOpen(true)
  }

  function abrirEditar(arbitro: Profile) {
    setEditando(arbitro)
    setForm({
      nome: arbitro.nome,
      email: '',
      telefone: arbitro.telefone ?? '',
      categoria: arbitro.categoria ?? '',
      valor_por_jogo: String(arbitro.valor_por_jogo),
    })
    setOpen(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    if (editando) {
      const { error } = await supabase.from('profiles').update({
        nome: form.nome,
        telefone: form.telefone || null,
        categoria: form.categoria || null,
        valor_por_jogo: parseFloat(form.valor_por_jogo) || 0,
      }).eq('id', editando.id)

      if (error) { toast.error('Erro ao salvar: ' + error.message) }
      else { toast.success('Árbitro atualizado!'); setOpen(false) }
    } else {
      // Cria usuário via API route
      const res = await fetch('/api/arbitros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erro ao criar árbitro') }
      else { toast.success('Árbitro cadastrado! Email enviado.'); setOpen(false) }
    }

    setLoading(false)
    router.refresh()
  }

  async function toggleAtivo(arbitro: Profile) {
    const supabase = createClient()
    const { error } = await supabase.from('profiles')
      .update({ ativo: !arbitro.ativo })
      .eq('id', arbitro.id)
    if (error) toast.error('Erro ao atualizar')
    else toast.success(arbitro.ativo ? 'Árbitro desativado' : 'Árbitro ativado')
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={abrirNovo}>
          <Plus className="mr-2 h-4 w-4" /> Novo Árbitro
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {arbitros.map((a) => (
          <Card key={a.id} className={!a.ativo ? 'opacity-60' : ''}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{a.nome}</p>
                  {a.categoria && (
                    <Badge variant="secondary" className="text-xs mt-1">{a.categoria}</Badge>
                  )}
                </div>
                <Badge variant={a.ativo ? 'default' : 'outline'} className="shrink-0">
                  {a.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              {a.telefone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {a.telefone}
                </p>
              )}
              <p className="text-sm font-medium text-green-400">
                R$ {a.valor_por_jogo.toFixed(2)} / jogo
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => abrirEditar(a)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleAtivo(a)}>
                  {a.ativo ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {arbitros.length === 0 && (
          <p className="text-muted-foreground col-span-3 text-sm py-8 text-center">
            Nenhum árbitro cadastrado ainda.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Árbitro' : 'Novo Árbitro'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            {!editando && (
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(48) 99999-9999" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} placeholder="Ex: A1, B2..." />
              </div>
              <div className="space-y-2">
                <Label>Valor por Jogo (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor_por_jogo} onChange={e => setForm(f => ({ ...f, valor_por_jogo: e.target.value }))} required />
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
