import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminNav from '@/components/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/arbitro')

  return (
    <div className="min-h-screen bg-surface">
      <AdminNav nome={profile.nome} />
      <main className="min-h-screen lg:ml-[260px]">
        <div className="mx-auto w-full max-w-7xl p-5 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
