'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MapPin, Clock } from 'lucide-react'
import type { Jogo, Escalacao } from '@/types'

type Competicao = { id: string; nome: string; categoria: string }
type JogoComEsc = Jogo & { competicao: Competicao | null; escalacoes: Escalacao[] }

const statusColors: Record<string, string> = {
  pendente: 'bg-brand-orange/15 text-brand-orange-deep',
  escalado: 'bg-green-600/10 text-green-700',
  realizado: 'bg-green-600/10 text-green-700',
  cancelado: 'bg-surface-container-high text-on-surface-variant',
}

const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  escalado: 'Escalado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

const emptyForm = {
  competicao_id: '', data: '', horario: '', local: '', mandante: '', visitante: '', arbitros_necessarios: '2',
}

export default function JogosClient({ jogos, competicoes }: { jogos: JogoComEsc[]; competicoes: Competicao[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<JogoComEsc | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [form, setForm] = useState(emptyForm)

  const jogosFiltrados = jogos.filter(j =>
    (filtro === 'todos' || filtro === '' || j.competicao_id === filtro) &&
    (filtroStatus === 'todos' || filtroStatus === '' || j.status === filtroStatus)
  )

  function f(key: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  function abrirNovo() {
    setEditando(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function abrirEditar(j: JogoComEsc) {
    setEditando(j)
    setForm({
      competicao_id: j.competicao_id,
      data: j.data,
      horario: j.horario?.slice(0, 5) ?? '',
      local: j.local,
      mandante: j.mandante,
      visitante: j.visitante,
      arbitros_necessarios: String(j.arbitros_necessarios),
    })
    setOpen(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const payload = { ...form, arbitros_necessarios: parseInt(form.arbitros_necessarios) }

    const { error } = editando
      ? await supabase.from('jogos').update(payload).eq('id', editando.id)
      : await supabase.from('jogos').insert(payload)

    if (error) toast.error('Erro: ' + error.message)
    else { toast.success(editando ? 'Jogo atualizado!' : 'Jogo criado!'); setOpen(false) }
    setLoading(false)
    router.refresh()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este jogo? Esta ação não pode ser desfeita.')) return
    const supabase = createClient()
    const { error } = await supabase.from('jogos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else toast.success('Jogo excluído')
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Todas as competições" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as competições</SelectItem>
              {competicoes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="escalado">Escalado</SelectItem>
              <SelectItem value="realizado">Realizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={abrirNovo}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-navy-deep to-primary-container px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Novo Jogo
        </Button>
      </div>

      <div className="space-y-3">
        {jogosFiltrados.map((j: JogoComEsc) => {
          const escalados = j.escalacoes?.length ?? 0
          return (
            <div key={j.id} className="rounded-xl border border-outline-variant/10 bg-surface p-4 transition-colors hover:bg-surface-container-high">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-on-surface">{j.mandante} <span className="font-normal text-on-surface-variant">×</span> {j.visitante}</p>
                  <p className="text-xs font-medium text-on-surface-variant/80">{j.competicao?.nome}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(j.data + 'T00:00:00').toLocaleDateString('pt-BR')} às {j.horario?.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {j.local}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${statusColors[j.status]}`}>{statusLabel[j.status]}</span>
                  <span className="text-xs text-on-surface-variant">{escalados}/{j.arbitros_necessarios} árbitros</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => abrirEditar(j)}>
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => excluir(j.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          )
        })}
        {jogosFiltrados.length === 0 && (
          <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum jogo encontrado.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Jogo' : 'Novo Jogo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Competição *</Label>
              <Select value={form.competicao_id} onValueChange={v => setForm(f => ({ ...f, competicao_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {competicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={f('data')} required />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input type="time" value={form.horario} onChange={f('horario')} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local *</Label>
              <Input value={form.local} onChange={f('local')} placeholder="Ginásio Municipal" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mandante *</Label>
                <Input value={form.mandante} onChange={f('mandante')} required />
              </div>
              <div className="space-y-2">
                <Label>Visitante *</Label>
                <Input value={form.visitante} onChange={f('visitante')} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Árbitros necessários *</Label>
              <Select value={form.arbitros_necessarios} onValueChange={v => setForm(f => ({ ...f, arbitros_necessarios: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 árbitro</SelectItem>
                  <SelectItem value="2">2 árbitros</SelectItem>
                </SelectContent>
              </Select>
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
