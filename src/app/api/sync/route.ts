import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { coletarCompeticoesEJogos, coletarArbitros, coletarVenues } from '@/lib/placarsoft'

export const maxDuration = 120

export async function POST(request: Request) {
  // Auth: Bearer SYNC_SECRET (timer) OU sessão admin (botão manual)
  const auth = request.headers.get('authorization')
  const secret = process.env.SYNC_SECRET
  const bearerOk = !!secret && auth === `Bearer ${secret}`
  if (!bearerOk) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: me } = user
      ? await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      : { data: null }
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const origem = bearerOk ? 'timer' : 'manual'

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: logRow } = await admin.from('sync_logs').insert({ origem, status: 'rodando' }).select('id').single()
  const logId = logRow?.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resumo: any = { competicoes: { novas: 0, atualizadas: 0 }, jogos: { novos: 0, atualizados: 0, realizados: 0 }, arbitros: { atualizados: 0, novos: 0 }, venues: { total: 0 } }

  try {
    const [{ competicoes, jogos }, arbitros, venues] = await Promise.all([
      coletarCompeticoesEJogos(2026),
      coletarArbitros(),
      coletarVenues(),
    ])

    // ---- COMPETIÇÕES: backfill placarsoft_id por nome, depois upsert ----
    const { data: compExist } = await admin.from('competicoes').select('id, nome, placarsoft_id')
    const compPorNome = new Map((compExist ?? []).map(c => [c.nome.toLowerCase(), c]))
    for (const c of competicoes) {
      const ex = compPorNome.get(c.nome.toLowerCase())
      if (ex && !ex.placarsoft_id) await admin.from('competicoes').update({ placarsoft_id: c.placarsoft_id }).eq('id', ex.id)
    }
    const existentesPsid = new Set((compExist ?? []).map(c => c.placarsoft_id).filter(Boolean))
    for (const c of competicoes) {
      const { error } = await admin.from('competicoes').upsert(
        { placarsoft_id: c.placarsoft_id, nome: c.nome, categoria: c.categoria || 'Voleibol', categoria_etaria: c.categoria_etaria, temporada: c.temporada, data_inicio: c.data_inicio, data_fim: c.data_fim },
        { onConflict: 'placarsoft_id' })
      if (!error) existentesPsid.has(c.placarsoft_id) ? resumo.competicoes.atualizadas++ : resumo.competicoes.novas++
    }

    // mapa competicao_psid -> id
    const { data: compAll } = await admin.from('competicoes').select('id, placarsoft_id')
    const compIdPorPsid = new Map((compAll ?? []).filter(c => c.placarsoft_id).map(c => [c.placarsoft_id as string, c.id as string]))

    // ---- JOGOS: backfill por chave natural, depois upsert (sem tocar status) ----
    const { data: jogosExist } = await admin.from('jogos').select('id, placarsoft_id, competicao_id, mandante, visitante, data')
    const chaveJogo = (competicao_id: string, m: string, v: string, d: string) => `${competicao_id}|${m}|${v}|${d}`
    const jogoPorChave = new Map((jogosExist ?? []).map(j => [chaveJogo(j.competicao_id, j.mandante, j.visitante, j.data), j]))
    const jogosPsidExist = new Set((jogosExist ?? []).map(j => j.placarsoft_id).filter(Boolean))
    const doneIds: string[] = []
    for (const j of jogos) {
      const competicao_id = compIdPorPsid.get(j.competicao_psid)
      if (!competicao_id) continue
      const ex = jogoPorChave.get(chaveJogo(competicao_id, j.mandante, j.visitante, j.data))
      if (ex && !ex.placarsoft_id) await admin.from('jogos').update({ placarsoft_id: j.placarsoft_id }).eq('id', ex.id)
      const novo = !ex && !jogosPsidExist.has(j.placarsoft_id)
      const { error } = await admin.from('jogos').upsert(
        { placarsoft_id: j.placarsoft_id, competicao_id, mandante: j.mandante, visitante: j.visitante, data: j.data, horario: j.horario, local: j.local },
        { onConflict: 'placarsoft_id' })
      if (!error) { novo ? resumo.jogos.novos++ : resumo.jogos.atualizados++; if (j.realizado) doneIds.push(j.placarsoft_id) }
    }
    // marca realizados (sem clobbar escalado/confirmada)
    if (doneIds.length) {
      const { data: upd } = await admin.from('jogos').update({ status: 'realizado' }).in('placarsoft_id', doneIds).eq('status', 'pendente').select('id')
      resumo.jogos.realizados = upd?.length ?? 0
    }

    // ---- VENUES: upsert ----
    if (venues.length) {
      await admin.from('venues').upsert(venues.map(v => ({ placarsoft_id: v.placarsoft_id, nome: v.nome, cidade: v.cidade, bairro: v.bairro, tipo: v.tipo })), { onConflict: 'placarsoft_id' })
      resumo.venues.total = venues.length
    }

    // ---- ÁRBITROS: backfill por nome, atualiza foto/categoria/funções (não cria auth users no sync) ----
    const { data: arbExist } = await admin.from('profiles').select('id, nome, placarsoft_id').eq('role', 'arbitro')
    const arbPorNome = new Map((arbExist ?? []).map(a => [a.nome.toLowerCase(), a]))
    const arbPorPsid = new Map((arbExist ?? []).filter(a => a.placarsoft_id).map(a => [a.placarsoft_id as string, a]))
    for (const a of arbitros) {
      let alvo = arbPorPsid.get(a.placarsoft_id) ?? arbPorNome.get(a.nome.toLowerCase())
      if (alvo) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patch: any = { placarsoft_id: a.placarsoft_id }
        if (a.categoria) patch.categoria = a.categoria
        if (a.funcoes.length) patch.funcoes_habilitadas = a.funcoes
        if (a.foto_url) patch.foto_url = a.foto_url
        await admin.from('profiles').update(patch).eq('id', alvo.id)
        resumo.arbitros.atualizados++
      } else {
        resumo.arbitros.novos++ // reportado; criação de login fica manual (precisa email real)
      }
    }

    await admin.from('sync_logs').update({ status: 'ok', concluido_em: new Date().toISOString(), resumo }).eq('id', logId)
    return NextResponse.json({ ok: true, resumo })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await admin.from('sync_logs').update({ status: 'erro', concluido_em: new Date().toISOString(), resumo, erro: msg }).eq('id', logId)
    return NextResponse.json({ error: msg, resumo }, { status: 500 })
  }
}
