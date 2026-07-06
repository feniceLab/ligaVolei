'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, CheckCircle2, XCircle, Clock, Trophy, CalendarDays, Users, MapPin } from 'lucide-react'

export type SyncLog = {
  id: string; origem: string; iniciado_em: string; concluido_em: string | null
  status: 'rodando' | 'ok' | 'erro'; resumo: Resumo | null; erro: string | null
}
type Resumo = {
  competicoes?: { novas: number; atualizadas: number }
  jogos?: { novos: number; atualizados: number; realizados: number }
  arbitros?: { atualizados: number; novos: number }
  venues?: { total: number }
}

export default function SincronizacaoClient({ logs }: { logs: SyncLog[] }) {
  const router = useRouter()
  const [rodando, setRodando] = useState(false)

  async function sincronizar() {
    setRodando(true)
    const t = toast.loading('Sincronizando com o PlacarSoft…')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Falha na sincronização')
      const r: Resumo = d.resumo ?? {}
      toast.success(
        `Sync ok — jogos: ${r.jogos?.novos ?? 0} novos / ${r.jogos?.atualizados ?? 0} atualizados; árbitros: ${r.arbitros?.atualizados ?? 0} atualizados (${r.arbitros?.novos ?? 0} novos); ginásios: ${r.venues?.total ?? 0}.`,
        { id: t, duration: 8000 })
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro', { id: t })
    } finally {
      setRodando(false)
    }
  }

  const ultimo = logs.find(l => l.status === 'ok')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
        <div>
          <p className="text-sm font-bold text-primary">Sincronizar agora</p>
          <p className="text-xs text-on-surface-variant">
            {ultimo ? `Última sincronização: ${new Date(ultimo.iniciado_em).toLocaleString('pt-BR')}` : 'Nenhuma sincronização ainda.'}
          </p>
        </div>
        <Button onClick={sincronizar} disabled={rodando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${rodando ? 'animate-spin' : ''}`} />
          {rodando ? 'Sincronizando…' : 'Sincronizar agora'}
        </Button>
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Histórico</h2>
        </div>
        <div className="p-4 sm:p-6">
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhuma sincronização registrada.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => {
                const st = l.status === 'ok'
                  ? { ic: CheckCircle2, cls: 'text-green-600', txt: 'OK' }
                  : l.status === 'erro'
                  ? { ic: XCircle, cls: 'text-destructive', txt: 'Erro' }
                  : { ic: Clock, cls: 'text-brand-orange-deep', txt: 'Rodando' }
                const Ic = st.ic
                const r = l.resumo
                return (
                  <div key={l.id} className="rounded-xl border border-outline-variant/10 bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Ic className={`h-4 w-4 ${st.cls}`} />
                        <span className="text-sm font-bold text-on-surface">{new Date(l.iniciado_em).toLocaleString('pt-BR')}</span>
                        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{l.origem}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>{st.txt}</span>
                      </div>
                      {r && l.status === 'ok' && (
                        <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{(r.competicoes?.novas ?? 0) + (r.competicoes?.atualizadas ?? 0)} comp.</span>
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{r.jogos?.novos ?? 0} novos / {r.jogos?.atualizados ?? 0} atu.{(r.jogos?.realizados ?? 0) > 0 ? ` / ${r.jogos?.realizados} realizados` : ''}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.arbitros?.atualizados ?? 0} árb.{(r.arbitros?.novos ?? 0) > 0 ? ` (+${r.arbitros?.novos} novos)` : ''}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.venues?.total ?? 0} ginásios</span>
                        </div>
                      )}
                    </div>
                    {l.erro && <p className="mt-1 text-xs text-destructive">{l.erro}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-4 py-3 text-xs text-on-surface-variant">
        Árbitros <strong>novos</strong> aparecem no resumo mas o login só é criado manualmente (precisa do e-mail real). Foto, categoria e funções dos já cadastrados são atualizadas automaticamente.
      </div>
    </div>
  )
}
