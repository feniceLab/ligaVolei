'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Save, Camera, Upload, FileText, Trash2, Download, User, CreditCard,
  MapPin, Award, CheckCircle2, XCircle, Clock, DollarSign, TrendingUp,
} from 'lucide-react'
import type { Profile, ArbitroDocumento, FuncaoArbitragem } from '@/types'
import { FUNCAO_LABEL } from '@/types'

export type EscalacaoFicha = {
  id: string; funcao: FuncaoArbitragem; status: string; valor: number | null
  pago: boolean; pago_em: string | null; escalado_em: string; respondido_em: string | null
  motivo_recusa: string | null; data: string; mandante: string; visitante: string; competicao: string
}
export type EventoFicha = {
  id: string; acao: string; valor: number | null; motivo: string | null; criado_em: string; jogo: string; data: string
}
type Metrics = {
  totalEscalacoes: number; confirmadas: number; recusadas: number; pendentes: number
  taxaAceite: number | null; jogosFeitos: number; totalRecebido: number; aReceber: number; descontoPct: number
}

const CATEGORIAS = ['Internacional', 'Especial', 'Nacional', 'Aspirante a Nacional', 'Regional', 'Iniciante']
const FUNCOES: FuncaoArbitragem[] = ['arbitro', 'juiz_linha', 'apontador', 'delegado']
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataBR = (d?: string | null) => d ? new Date(d.length <= 10 ? d + 'T00:00:00' : d).toLocaleDateString('pt-BR') : ''

interface Props {
  arbitro: Profile
  escalacoes: EscalacaoFicha[]
  eventos: EventoFicha[]
  documentos: ArbitroDocumento[]
  metrics: Metrics
}

export default function FichaClient({ arbitro, escalacoes, eventos, documentos, metrics }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'dados' | 'historico' | 'pagamentos' | 'metricas'>('dados')
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [tipoDoc, setTipoDoc] = useState('RG')
  const fotoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    nome: arbitro.nome ?? '', telefone: arbitro.telefone ?? '', categoria: arbitro.categoria ?? '',
    cpf: arbitro.cpf ?? '', pis: arbitro.pis ?? '', rg: arbitro.rg ?? '', rg_orgao: arbitro.rg_orgao ?? '',
    data_nascimento: arbitro.data_nascimento ?? '',
    chave_pix: arbitro.chave_pix ?? '', tipo_chave_pix: arbitro.tipo_chave_pix ?? '',
    banco: arbitro.banco ?? '', agencia: arbitro.agencia ?? '', conta: arbitro.conta ?? '',
    cnpj: arbitro.cnpj ?? '', inscricao_municipal: arbitro.inscricao_municipal ?? '',
    cep: arbitro.cep ?? '', cidade: arbitro.cidade ?? '', uf: arbitro.uf ?? '', logradouro: arbitro.logradouro ?? '',
    registro_federacao: arbitro.registro_federacao ?? '', data_filiacao: arbitro.data_filiacao ?? '',
    contato_emergencia: arbitro.contato_emergencia ?? '', tamanho_uniforme: arbitro.tamanho_uniforme ?? '',
    observacoes: arbitro.observacoes ?? '',
  })
  const [funcoes, setFuncoes] = useState<string[]>(arbitro.funcoes_habilitadas ?? [])
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(s => ({ ...s, [k]: e.target.value }))

  async function salvar() {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      ...f,
      data_nascimento: f.data_nascimento || null,
      data_filiacao: f.data_filiacao || null,
      tipo_chave_pix: f.tipo_chave_pix || null,
      funcoes_habilitadas: funcoes,
    }).eq('id', arbitro.id)
    setSaving(false)
    if (error) return toast.error('Erro ao salvar: ' + error.message)
    toast.success('Ficha salva!')
    router.refresh()
  }

  async function enviarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFoto(true)
    const path = `${arbitro.id}/foto-${Date.now()}.${file.name.split('.').pop()}`
    const up = await supabase.storage.from('arbitro-fotos').upload(path, file, { upsert: true })
    if (up.error) { setUploadingFoto(false); return toast.error('Erro no upload: ' + up.error.message) }
    const { data: pub } = supabase.storage.from('arbitro-fotos').getPublicUrl(path)
    const { error } = await supabase.from('profiles').update({ foto_url: pub.publicUrl }).eq('id', arbitro.id)
    setUploadingFoto(false)
    if (error) return toast.error('Erro ao salvar foto')
    toast.success('Foto atualizada!')
    router.refresh()
  }

  async function enviarDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = `${arbitro.id}/${Date.now()}-${file.name}`
    const up = await supabase.storage.from('arbitro-docs').upload(path, file)
    if (up.error) return toast.error('Erro no upload: ' + up.error.message)
    const { error } = await supabase.from('arbitro_documentos').insert({ arbitro_id: arbitro.id, tipo: tipoDoc, nome: file.name, path })
    if (error) return toast.error('Erro ao registrar documento')
    toast.success('Documento enviado!')
    if (docRef.current) docRef.current.value = ''
    router.refresh()
  }

  async function baixarDoc(doc: ArbitroDocumento) {
    const { data, error } = await supabase.storage.from('arbitro-docs').createSignedUrl(doc.path, 120)
    if (error || !data) return toast.error('Não foi possível gerar o link')
    window.open(data.signedUrl, '_blank')
  }

  async function removerDoc(doc: ArbitroDocumento) {
    await supabase.storage.from('arbitro-docs').remove([doc.path])
    const { error } = await supabase.from('arbitro_documentos').delete().eq('id', doc.id)
    if (error) return toast.error('Erro ao remover')
    toast.success('Documento removido')
    router.refresh()
  }

  const tabs = [
    { id: 'dados' as const, label: 'Dados & Documentos', icon: User },
    { id: 'historico' as const, label: 'Histórico', icon: Clock },
    { id: 'pagamentos' as const, label: 'Pagamentos', icon: DollarSign },
    { id: 'metricas' as const, label: 'Métricas', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-surface-container-high text-3xl font-bold text-primary">
            {arbitro.foto_url
              ? <Image src={arbitro.foto_url} alt={arbitro.nome} width={96} height={96} className="h-full w-full object-cover" unoptimized />
              : (arbitro.nome?.[0] ?? '?')}
          </div>
          <button
            onClick={() => fotoRef.current?.click()} disabled={uploadingFoto}
            className="absolute -bottom-2 -right-2 rounded-full bg-primary p-2 text-white shadow-lg transition-transform hover:scale-105"
            title="Trocar foto"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={enviarFoto} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-primary">{arbitro.nome}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {arbitro.categoria && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{arbitro.categoria}</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${arbitro.ativo ? 'bg-green-600/10 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
              {arbitro.ativo ? 'Ativo' : 'Inativo'}
            </span>
            {(arbitro.funcoes_habilitadas ?? []).map(fn => (
              <span key={fn} className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">{FUNCAO_LABEL[fn as FuncaoArbitragem] ?? fn}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-6 text-center">
          <div><p className="font-headline text-2xl font-extrabold text-brand-orange-deep">{brl(metrics.aReceber)}</p><p className="text-[11px] text-on-surface-variant">a receber</p></div>
          <div><p className="font-headline text-2xl font-extrabold text-green-700">{brl(metrics.totalRecebido)}</p><p className="text-[11px] text-on-surface-variant">já recebido</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-outline-variant/10 pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-bold transition-colors ${tab === t.id ? 'bg-surface-container-lowest text-primary shadow-editorial' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* DADOS & DOCUMENTOS */}
      {tab === 'dados' && (
        <div className="space-y-5">
          <Secao titulo="Pessoais" icon={User}>
            <Campo label="Nome"><Input value={f.nome} onChange={set('nome')} /></Campo>
            <Campo label="Telefone"><Input value={f.telefone} onChange={set('telefone')} placeholder="(48) 99999-9999" /></Campo>
            <Campo label="Data de nascimento"><Input type="date" value={f.data_nascimento} onChange={set('data_nascimento')} /></Campo>
            <Campo label="Categoria">
              <select value={f.categoria} onChange={set('categoria')} className={selCls}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <Campo label="RG"><Input value={f.rg} onChange={set('rg')} /></Campo>
            <Campo label="Órgão emissor"><Input value={f.rg_orgao} onChange={set('rg_orgao')} placeholder="SSP/SC" /></Campo>
          </Secao>

          <Secao titulo="Documentos fiscais" icon={FileText}>
            <Campo label="CPF"><Input value={f.cpf} onChange={set('cpf')} placeholder="000.000.000-00" /></Campo>
            <Campo label="PIS/PASEP"><Input value={f.pis} onChange={set('pis')} /></Campo>
            <Campo label="CNPJ (MEI)"><Input value={f.cnpj} onChange={set('cnpj')} placeholder="emite NF? preencha" /></Campo>
            <Campo label="Inscrição municipal"><Input value={f.inscricao_municipal} onChange={set('inscricao_municipal')} /></Campo>
          </Secao>

          <Secao titulo="Recebimento" icon={CreditCard}>
            <Campo label="Chave PIX"><Input value={f.chave_pix} onChange={set('chave_pix')} /></Campo>
            <Campo label="Tipo da chave">
              <select value={f.tipo_chave_pix} onChange={set('tipo_chave_pix')} className={selCls}>
                <option value="">—</option>
                <option value="cpf">CPF</option><option value="email">E-mail</option>
                <option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option>
              </select>
            </Campo>
            <Campo label="Banco"><Input value={f.banco} onChange={set('banco')} /></Campo>
            <Campo label="Agência"><Input value={f.agencia} onChange={set('agencia')} /></Campo>
            <Campo label="Conta"><Input value={f.conta} onChange={set('conta')} /></Campo>
          </Secao>

          <Secao titulo="Endereço" icon={MapPin}>
            <Campo label="CEP"><Input value={f.cep} onChange={set('cep')} /></Campo>
            <Campo label="Cidade"><Input value={f.cidade} onChange={set('cidade')} /></Campo>
            <Campo label="UF"><Input value={f.uf} onChange={set('uf')} maxLength={2} placeholder="SC" /></Campo>
            <Campo label="Logradouro" full><Input value={f.logradouro} onChange={set('logradouro')} /></Campo>
          </Secao>

          <Secao titulo="Arbitragem" icon={Award}>
            <Campo label="Registro federação/CBV"><Input value={f.registro_federacao} onChange={set('registro_federacao')} /></Campo>
            <Campo label="Data de filiação"><Input type="date" value={f.data_filiacao} onChange={set('data_filiacao')} /></Campo>
            <Campo label="Funções habilitadas" full>
              <div className="flex flex-wrap gap-2 pt-1">
                {FUNCOES.map(fn => {
                  const on = funcoes.includes(fn)
                  return (
                    <button key={fn} type="button"
                      onClick={() => setFuncoes(s => on ? s.filter(x => x !== fn) : [...s, fn])}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {FUNCAO_LABEL[fn]}
                    </button>
                  )
                })}
              </div>
            </Campo>
            <Campo label="Contato de emergência"><Input value={f.contato_emergencia} onChange={set('contato_emergencia')} /></Campo>
            <Campo label="Tamanho de uniforme"><Input value={f.tamanho_uniforme} onChange={set('tamanho_uniforme')} placeholder="M / G / GG" /></Campo>
            <Campo label="Observações" full>
              <textarea value={f.observacoes} onChange={set('observacoes')} rows={2} className={`${selCls} resize-y`} />
            </Campo>
          </Secao>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar ficha'}</Button>
          </div>

          {/* Documentos anexos */}
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Documentos anexados</p>
              <div className="flex items-center gap-2">
                <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} className={selCls + ' w-auto'}>
                  <option>RG</option><option>CPF</option><option>Comprovante bancário</option>
                  <option>Cartão CNPJ</option><option>Comprovante de endereço</option><option>Outro</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => docRef.current?.click()}><Upload className="mr-1 h-3.5 w-3.5" /> Enviar</Button>
                <input ref={docRef} type="file" className="hidden" onChange={enviarDoc} />
              </div>
            </div>
            {documentos.length === 0 ? (
              <p className="py-4 text-center text-sm text-on-surface-variant">Nenhum documento anexado.</p>
            ) : (
              <div className="space-y-1.5">
                {documentos.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate text-sm text-on-surface">{d.nome}</span>
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">{d.tipo}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => baixarDoc(d)} title="Baixar"><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => removerDoc(d)} title="Remover"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {tab === 'historico' && (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial sm:p-6">
          {eventos.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Sem histórico ainda.</p>
          ) : (
            <ol className="space-y-3">
              {eventos.map(ev => {
                const meta = ({
                  escalada: { cor: 'text-primary', ic: Clock, txt: 'Escalado' },
                  confirmada: { cor: 'text-green-700', ic: CheckCircle2, txt: 'Confirmou' },
                  recusada: { cor: 'text-destructive', ic: XCircle, txt: 'Recusou' },
                  cancelada: { cor: 'text-on-surface-variant', ic: XCircle, txt: 'Cancelada' },
                  pago: { cor: 'text-green-700', ic: DollarSign, txt: 'Pago' },
                }) as Record<string, { cor: string; ic: typeof Clock; txt: string }>
                const m = meta[ev.acao] ?? { cor: 'text-on-surface-variant', ic: Clock, txt: ev.acao }
                const Ic = m.ic
                return (
                  <li key={ev.id} className="flex gap-3">
                    <Ic className={`mt-0.5 h-4 w-4 shrink-0 ${m.cor}`} />
                    <div className="min-w-0 flex-1 border-b border-outline-variant/5 pb-3">
                      <p className="text-sm text-on-surface"><span className={`font-bold ${m.cor}`}>{m.txt}</span> — {ev.jogo || 'jogo'}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(ev.criado_em).toLocaleString('pt-BR')}
                        {ev.valor != null && ` · ${brl(Number(ev.valor))}`}
                        {ev.motivo && ` · motivo: ${ev.motivo}`}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      {/* PAGAMENTOS */}
      {tab === 'pagamentos' && (
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial sm:p-6">
          {escalacoes.filter(e => e.status === 'confirmada').length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum jogo confirmado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {escalacoes.filter(e => e.status === 'confirmada').map(e => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-on-surface">{e.mandante} × {e.visitante}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{FUNCAO_LABEL[e.funcao]}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">{dataBR(e.data)} · {e.competicao}</p>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-right">
                      <span className={`block text-sm font-bold ${e.pago ? 'text-green-700' : 'text-brand-orange-deep'}`}>{brl(Number(e.valor ?? 0))}</span>
                      {metrics.descontoPct > 0 && <span className="block text-[10px] text-on-surface-variant">líq. {brl(Number(e.valor ?? 0) * (1 - metrics.descontoPct / 100))}</span>}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${e.pago ? 'bg-green-600/10 text-green-700' : 'bg-brand-orange/15 text-brand-orange-deep'}`}>{e.pago ? 'Pago' : 'A receber'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MÉTRICAS */}
      {tab === 'metricas' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi titulo="Taxa de aceite" valor={metrics.taxaAceite != null ? `${metrics.taxaAceite}%` : '—'} sub={`${metrics.confirmadas} sim · ${metrics.recusadas} não`} />
          <Kpi titulo="Jogos confirmados" valor={String(metrics.jogosFeitos)} sub={`${metrics.totalEscalacoes} escalações no total`} />
          <Kpi titulo="Pendentes de resposta" valor={String(metrics.pendentes)} sub="aguardando o árbitro" />
          <Kpi titulo="Já recebido" valor={brl(metrics.totalRecebido)} sub="pagamentos quitados" cor="text-green-700" />
          <Kpi titulo="A receber" valor={brl(metrics.aReceber)} sub="confirmado, não pago" cor="text-brand-orange-deep" />
          <Kpi titulo="Recusas" valor={String(metrics.recusadas)} sub="jogos negados" />
        </div>
      )}
    </div>
  )
}

const selCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

function Secao({ titulo, icon: Icon, children }: { titulo: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant"><Icon size={14} className="text-brand-orange-deep" /> {titulo}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  )
}
function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1 ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <Label className="text-[11px] font-bold text-on-surface-variant">{label}</Label>
      {children}
    </div>
  )
}
function Kpi({ titulo, valor, sub, cor }: { titulo: string; valor: string; sub: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-editorial">
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{titulo}</p>
      <p className={`mt-2 font-headline text-3xl font-extrabold tracking-tight ${cor ?? 'text-primary'}`}>{valor}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>
    </div>
  )
}
