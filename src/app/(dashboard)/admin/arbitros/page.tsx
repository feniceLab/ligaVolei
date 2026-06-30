import { createClient } from '@/lib/supabase/server'
import ArbitrosClient from './arbitros-client'

export default async function ArbitrosPage() {
  const supabase = await createClient()
  const { data: arbitros } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'arbitro')
    .order('nome')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Árbitros</h1>
          <p className="text-muted-foreground">Gerencie os árbitros da liga</p>
        </div>
      </div>
      <ArbitrosClient arbitros={arbitros ?? []} />
    </div>
  )
}
