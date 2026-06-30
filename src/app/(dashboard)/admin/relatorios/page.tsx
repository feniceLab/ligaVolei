import { createClient } from '@/lib/supabase/server'
import RelatoriosClient from './relatorios-client'

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const { data: competicoes } = await supabase
    .from('competicoes')
    .select('id, nome, temporada')
    .order('data_inicio', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
        <p className="text-muted-foreground">Total a pagar por competição e período</p>
      </div>
      <RelatoriosClient competicoes={competicoes ?? []} />
    </div>
  )
}
