import { createClient } from '@/lib/supabase/server'
import CompeticoesClient from './competicoes-client'

export default async function CompeticoesPage() {
  const supabase = await createClient()
  const { data: competicoes } = await supabase
    .from('competicoes')
    .select('*')
    .order('data_inicio', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Competições</h1>
        <p className="text-muted-foreground">Gerencie as competições da liga</p>
      </div>
      <CompeticoesClient competicoes={competicoes ?? []} />
    </div>
  )
}
