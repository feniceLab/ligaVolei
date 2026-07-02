import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// Admin escala um árbitro: grava valor (campeonato x categoria), notifica o árbitro, registra evento
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { jogo_id, arbitro_id } = await request.json()
  if (!jogo_id || !arbitro_id) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: jogo }, { data: arbitro }] = await Promise.all([
    admin.from('jogos').select('id, competicao_id, arbitros_necessarios, data, horario, mandante, visitante, competicao:competicoes(nome)').eq('id', jogo_id).single(),
    admin.from('profiles').select('id, nome, categoria, user_id').eq('id', arbitro_id).single(),
  ])
  if (!jogo || !arbitro) return NextResponse.json({ error: 'Jogo ou árbitro inexistente' }, { status: 404 })

  // valor = tabela do campeonato p/ a categoria do árbitro (fallback: categoria 'PADRAO')
  let valor: number | null = null
  const { data: vrows } = await admin
    .from('competicao_valores')
    .select('categoria, valor')
    .eq('competicao_id', jogo.competicao_id)
  if (vrows?.length) {
    const exato = vrows.find(v => v.categoria === arbitro.categoria)
    const padrao = vrows.find(v => v.categoria === 'PADRAO')
    valor = (exato ?? padrao)?.valor ?? null
  }

  const { data: novaEsc, error: insErr } = await admin
    .from('escalacoes')
    .insert({ jogo_id, arbitro_id, status: 'pendente', valor, notificado: true })
    .select('id')
    .single()
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })

  await admin.from('escalacao_eventos').insert({
    escalacao_id: novaEsc.id, arbitro_id, jogo_id, acao: 'escalada', valor,
  })

  // marca jogo como escalado se completou as vagas
  const { count } = await admin.from('escalacoes').select('id', { count: 'exact', head: true }).eq('jogo_id', jogo_id)
  if ((count ?? 0) >= jogo.arbitros_necessarios) {
    await admin.from('jogos').update({ status: 'escalado' }).eq('id', jogo_id)
  }

  // notifica o árbitro (se tiver email real)
  try {
    const { data: u } = await admin.auth.admin.getUserById(arbitro.user_id)
    const email = u.user?.email
    if (email && !email.endsWith('@arbitros.lcv.com.br')) {
      const comp = jogo.competicao
      const compNome = Array.isArray(comp) ? comp[0]?.nome : (comp as { nome?: string } | null)?.nome
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: email,
        subject: `🏐 Você foi escalado: ${jogo.mandante} × ${jogo.visitante}`,
        html: `
          <h2>Olá, ${arbitro.nome}!</h2>
          <p>Você foi escalado para um jogo da Liga Catarinense de Voleibol.</p>
          <p><strong>${jogo.mandante} × ${jogo.visitante}</strong><br/>
          ${new Date(jogo.data + 'T00:00:00').toLocaleDateString('pt-BR')} às ${jogo.horario?.slice(0, 5)}<br/>
          ${compNome ?? ''}${valor != null ? ` — <strong>${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>` : ''}</p>
          <p>Acesse e <strong>confirme ou recuse</strong>: <a href="${process.env.NEXT_PUBLIC_APP_URL}/arbitro">${process.env.NEXT_PUBLIC_APP_URL}/arbitro</a></p>
        `,
      })
    }
  } catch (e) {
    console.error('Erro ao notificar árbitro:', e)
  }

  return NextResponse.json({ success: true, valor })
}
