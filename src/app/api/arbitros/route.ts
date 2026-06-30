import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verifica se é admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { nome, email, telefone, categoria, valor_por_jogo } = await request.json()

  if (!nome || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
  }

  // Gera senha temporária
  const senha = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()

  // Cria usuário com Service Role
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, role: 'arbitro' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Atualiza perfil com dados adicionais
  await adminSupabase.from('profiles').update({
    telefone: telefone || null,
    categoria: categoria || null,
    valor_por_jogo: parseFloat(valor_por_jogo) || 0,
  }).eq('user_id', newUser.user.id)

  // Envia email de boas-vindas
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: '🏐 Bem-vindo à Liga Catarinense de Voleibol',
      html: `
        <h2>Olá, ${nome}!</h2>
        <p>Você foi cadastrado no sistema de gestão de árbitros da <strong>Liga Catarinense de Voleibol</strong>.</p>
        <p>Suas credenciais de acesso:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Senha temporária:</strong> ${senha}</li>
        </ul>
        <p>Acesse o sistema em: <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">${process.env.NEXT_PUBLIC_APP_URL}/login</a></p>
        <p>Recomendamos que você troque sua senha após o primeiro acesso.</p>
        <br/>
        <p>Liga Catarinense de Voleibol</p>
      `,
    })
  } catch (emailError) {
    console.error('Erro ao enviar email:', emailError)
    // Não falha o cadastro por causa do email
  }

  return NextResponse.json({ success: true })
}
