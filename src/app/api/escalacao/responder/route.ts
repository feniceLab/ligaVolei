import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// Árbitro confirma ou recusa uma escalação
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

  const { escalacao_id, acao, motivo } = await request.json()
  if (!escalacao_id || !['confirmada', 'recusada'].includes(acao)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Confirma que a escalação é DESTE árbitro (RLS + checagem explícita)
  const { data: esc } = await supabase
    .from('escalacoes')
    .select('id, arbitro_id, jogo_id, valor, status, jogo:jogos(data, horario, mandante, visitante, competicao:competicoes(nome))')
    .eq('id', escalacao_id)
    .eq('arbitro_id', profile.id)
    .single()
  if (!esc) return NextResponse.json({ error: 'Escalação não encontrada' }, { status: 404 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const agora = new Date().toISOString()
  const { error: upErr } = await admin
    .from('escalacoes')
    .update({
      status: acao,
      respondido_em: agora,
      motivo_recusa: acao === 'recusada' ? (motivo || null) : null,
    })
    .eq('id', escalacao_id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  // Histórico imutável
  await admin.from('escalacao_eventos').insert({
    escalacao_id,
    arbitro_id: profile.id,
    jogo_id: esc.jogo_id,
    acao,
    valor: esc.valor,
    motivo: acao === 'recusada' ? (motivo || null) : null,
  })

  // Notifica o(s) admin(s) por email
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jogo: any = Array.isArray(esc.jogo) ? esc.jogo[0] : esc.jogo
    const { data: admins } = await admin.from('profiles').select('user_id').eq('role', 'admin')
    const emails: string[] = []
    for (const a of admins ?? []) {
      const { data } = await admin.auth.admin.getUserById(a.user_id)
      if (data.user?.email) emails.push(data.user.email)
    }
    if (emails.length) {
      const comp = jogo?.competicao
      const compNome = Array.isArray(comp) ? comp[0]?.nome : comp?.nome
      const label = acao === 'confirmada' ? '✅ CONFIRMOU' : '❌ RECUSOU'
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: emails,
        subject: `${label} — ${profile.nome} (${jogo?.mandante} × ${jogo?.visitante})`,
        html: `
          <h2>${profile.nome} ${acao === 'confirmada' ? 'confirmou' : 'recusou'} a escalação</h2>
          <p><strong>Jogo:</strong> ${jogo?.mandante} × ${jogo?.visitante}</p>
          <p><strong>Data:</strong> ${jogo?.data ? new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} às ${jogo?.horario?.slice(0, 5) ?? ''}</p>
          <p><strong>Competição:</strong> ${compNome ?? ''}</p>
          ${acao === 'recusada' && motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ''}
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/escalacao">Ver escalação</a></p>
        `,
      })
    }
  } catch (e) {
    console.error('Erro ao notificar admin:', e)
  }

  return NextResponse.json({ success: true })
}
