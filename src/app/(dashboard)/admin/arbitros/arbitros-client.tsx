'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        <button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-navy-deep to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Novo Árbitro
        </button>
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Árbitros Cadastrados</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{arbitros.length}</span>
        </div>
        <div className="p-4 sm:p-6">
          {arbitros.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum árbitro cadastrado ainda.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {arbitros.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border border-outline-variant/10 bg-surface p-4 transition-colors hover:bg-surface-container-high ${!a.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-on-surface">{a.nome}</p>
                        {a.categoria && (
                          <span className="mt-1 inline-block rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{a.categoria}</span>
                        )}
                      </div>
                      <span
                        className={
                          a.ativo
                            ? 'shrink-0 rounded-full bg-green-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700'
                            : 'shrink-0 rounded-full bg-surface-container-high px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant'
                        }
                      >
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    {a.telefone && (
                      <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                        <Phone className="h-3 w-3" /> {a.telefone}
                      </p>
                    )}
                    <p className="text-sm font-bold text-brand-orange-deep">
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
