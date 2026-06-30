import { createClient } from '@/lib/supabase/server'
import RelatoriosClient from './relatorios-client'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: competicoes } = await supabase
    .from('competicoes')
    .select('id, nome, temporada')
    .order('data_inicio', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Financeiro</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Relatórios Financeiros</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Total a pagar por competição e período</p>
        </div>
      </div>
      <RelatoriosClient competicoes={competicoes ?? []} />
    </div>
  )
}
