import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArbitroNav from '@/components/arbitro-nav'

export default async function ArbitroLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col">
      <ArbitroNav nome={profile?.nome ?? ''} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {children}
      </main>
    </div>
  )
}
