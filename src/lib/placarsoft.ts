// Cliente da API pública do PlacarSoft (read-only, sem auth) + travessia de dados.
const BASE = 'https://lcv.b04.endor.esp.br/api/v1/portal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string): Promise<any> {
  const res = await fetch(BASE + path, { cache: 'no-store' })
  if (!res.ok) throw new Error(`PlacarSoft ${path} -> ${res.status}`)
  return res.json()
}

// Acha a primeira lista de objetos numa resposta aninhada (ou por chave)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findList(o: any, key?: string): any[] {
  if (Array.isArray(o)) {
    if (o.length && typeof o[0] === 'object') return o
    for (const v of o) { const r = findList(v, key); if (r.length) return r }
    return []
  }
  if (o && typeof o === 'object') {
    if (key && Array.isArray(o[key])) return o[key]
    if (!key) for (const v of Object.values(o)) if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v
    for (const v of Object.values(o)) { const r = findList(v, key); if (r.length) return r }
  }
  return []
}

export function categoriaEtaria(nome: string): string {
  const n = (nome || '').toLowerCase()
  if (/adulto/.test(n)) return 'Adulto'
  const m = n.match(/sub[ -]?(\d{2})/)
  return m ? `Sub ${m[1]}` : 'Adulto'
}

// "27/06/2026 11:00" -> { data:"2026-06-27", horario:"11:00:00" }
function parseInicio(s?: string): { data: string; horario: string } | null {
  if (!s) return null
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/)
  if (!m) return null
  return { data: `${m[3]}-${m[2]}-${m[1]}`, horario: `${m[4]}:${m[5]}:00` }
}

const ROLE_MAP: Record<string, string> = {
  'árbitro': 'arbitro', 'arbitro': 'arbitro',
  'juiz de linha': 'juiz_linha',
  'apontador': 'apontador', 'apontador 1': 'apontador', 'apontador 2': 'apontador',
  'delegado': 'delegado', 'delegado técnico': 'delegado', 'delegado tecnico': 'delegado',
}

export type SyncCompeticao = { placarsoft_id: string; nome: string; categoria: string; categoria_etaria: string; temporada: string; data_inicio: string; data_fim: string }
export type SyncJogo = { placarsoft_id: string; competicao_psid: string; mandante: string; visitante: string; data: string; horario: string; local: string; realizado: boolean }
export type SyncArbitro = { placarsoft_id: string; nome: string; categoria: string | null; funcoes: string[]; foto_url: string | null }
export type SyncVenue = { placarsoft_id: string; nome: string; cidade: string | null; bairro: string | null; tipo: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function paginado(path: string): Promise<any[]> {
  const out: any[] = []
  let page = 1
  for (;;) {
    const sep = path.includes('?') ? '&' : '?'
    const d = await api(`${path}${sep}page=${page}`)
    const pag = d.pagination ?? d
    const data = pag.data ?? []
    if (!data.length) break
    out.push(...data)
    const last = pag.last_page ?? page
    if (page >= last || page > 20) break
    page++
  }
  return out
}

export async function coletarCompeticoesEJogos(year = 2026): Promise<{ competicoes: SyncCompeticao[]; jogos: SyncJogo[] }> {
  const comps = await paginado(`/competitions?year=${year}`)
  const competicoes: SyncCompeticao[] = []
  const jogos: SyncJogo[] = []
  for (const c of comps) {
    const nome = c.common_name ?? c.name ?? 'Competição'
    const di = (c.starts_at ?? '').slice(0, 10) || `${year}-01-01`
    const df = (c.ends_at ?? '').slice(0, 10) || `${year}-12-31`
    competicoes.push({
      placarsoft_id: String(c.id), nome,
      categoria: c.gender_name ?? '', categoria_etaria: categoriaEtaria(nome),
      temporada: String(year), data_inicio: di, data_fim: df,
    })
    // travessia: phases -> phase(groups) -> group(duels)
    try {
      const phases = findList(await api(`/competitions/${c.id}/phases`))
      for (const ph of phases) {
        const pd = await api(`/competitions/phases/${ph.id}`)
        const groups = findList(pd, 'groups')
        for (const gr of groups) {
          const gd = await api(`/competitions/groups/${gr.id}`)
          const duels = findList(gd, 'duels')
          for (const d of duels) {
            const t = parseInicio(d.starts_at_formatted)
            if (!t || !d.team_1_name || !d.team_2_name) continue
            jogos.push({
              placarsoft_id: String(d.id), competicao_psid: String(c.id),
              mandante: d.team_1_name, visitante: d.team_2_name,
              data: t.data, horario: t.horario,
              local: d.space_name ?? d.address ?? '',
              realizado: !!d.done,
            })
          }
        }
      }
    } catch { /* competição sem chave montada ainda — ignora */ }
  }
  return { competicoes, jogos }
}

export async function coletarArbitros(): Promise<SyncArbitro[]> {
  const refs = await paginado('/referees')
  return refs.map(a => {
    const cats = new Set<string>()
    const funcs = new Set<string>()
    for (const rf of a.refs ?? []) {
      for (const c of rf.refereecategories_names_list ?? []) cats.add(c)
      for (const r of rf.refereeroles_names_list ?? []) {
        const key = ROLE_MAP[(r || '').toLowerCase().trim()]
        if (key) funcs.add(key)
      }
    }
    return {
      placarsoft_id: String(a.id), nome: a.name,
      categoria: [...cats][0] ?? null,
      funcoes: [...funcs],
      foto_url: a.image_url && !a.image_url.includes('default') ? a.image_url : null,
    }
  })
}

export async function coletarVenues(): Promise<SyncVenue[]> {
  const vs = await paginado('/venues')
  return vs.map(v => ({
    placarsoft_id: String(v.id), nome: v.common_name ?? v.name ?? 'Ginásio',
    cidade: v.city_name ?? null, bairro: v.district_name ?? null, tipo: v.venuestype_name ?? null,
  }))
}
