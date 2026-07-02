import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Admin marca escalação(ões) como paga(s) ou reverte o pagamento
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await request.json()
  const ids: string[] = Array.isArray(body.escalacao_ids)
    ? body.escalacao_ids
    : body.escalacao_id ? [body.escalacao_id] : []
  const pago: boolean = body.pago !== false // default: marcar como pago
  if (!ids.length) return NextResponse.json({ error: 'Nenhuma escalação informada' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const agora = new Date().toISOString()
  const { data: escs, error: upErr } = await admin
    .from('escalacoes')
    .update({ pago, pago_em: pago ? agora : null })
    .in('id', ids)
    .select('id, arbitro_id, jogo_id, valor')
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  // Histórico imutável — só registra evento quando marca como pago
  if (pago && escs?.length) {
    await admin.from('escalacao_eventos').insert(
      escs.map(e => ({
        escalacao_id: e.id,
        arbitro_id: e.arbitro_id,
        jogo_id: e.jogo_id,
        acao: 'pago' as const,
        valor: e.valor,
      })),
    )
  }

  const total = (escs ?? []).reduce((s, e) => s + Number(e.valor ?? 0), 0)
  return NextResponse.json({ success: true, count: escs?.length ?? 0, total })
}
