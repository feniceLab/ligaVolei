import { createClient } from '@/lib/supabase/server'
import SincronizacaoClient, { type SyncLog } from './sincronizacao-client'

export default async function SincronizacaoPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('sync_logs').select('*').order('iniciado_em', { ascending: false }).limit(30)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Integração</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Sincronização PlacarSoft</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Puxa competições, jogos, árbitros (foto/categoria/função) e ginásios do PlacarSoft. Roda sozinho a cada 6h; use o botão para forçar agora.</p>
      </div>
      <SincronizacaoClient logs={(logs ?? []) as SyncLog[]} />
    </div>
  )
}
