import { Annotation } from "@langchain/langgraph";

export const CATEGORIAS = ["cobranca", "tecnico", "comercial"] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export type ProximoNo = Categoria | "relatorio" | "resposta";

export function isCategoria(value: string): value is Categoria {
  return (CATEGORIAS as readonly string[]).includes(value);
}

export function isProximoNo(value: string): value is ProximoNo {
  return value === "relatorio" || value === "resposta" || isCategoria(value);
}

export type AnaliseEspecialista = {
  diagnostico: string;
  prioridade: string;
  resposta_sugerida: string;
  tags: string[];
  acao_sugerida?: string;
  raw?: string;
};

export type HopLogEntry = {
  hop: number;
  proximo: ProximoNo;
  pronto: boolean;
  justificativa: string;
};

export type SupervisorResult = {
  /** Categoria dominante (rótulo no relatório). */
  categoria: Categoria;
  /** Próximo passo decidido nesta visita ao supervisor. */
  proximo: ProximoNo;
  /** true quando a triagem pode fechar no relatório. */
  pronto: boolean;
  confianca: string;
  justificativa: string;
  /** Mensagem para o cliente (WhatsApp) quando proximo é resposta ou relatorio. */
  mensagem_cliente?: string;
};

export type AnalisesPorArea = Partial<Record<Categoria, AnaliseEspecialista>>;

/** Limite de visitas ao supervisor (anti-loop). */
export const MAX_SUPERVISOR_HOPS = Number(
  process.env.SUPERVISOR_MAX_HOPS ?? 5
);

export const TriagemAnnotation = Annotation.Root({
  ticketId: Annotation<string>,
  ticket: Annotation<string>,
  categoria: Annotation<Categoria | "">,
  // Nome diferente do nó "supervisor" — LangGraph proíbe canal e nó iguais
  supervisorResult: Annotation<SupervisorResult | null>,
  /** Contador de visitas ao supervisor (incrementado a cada entrada). */
  hop: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  /** Histórico de decisões do supervisor (para o relatório). */
  hopLog: Annotation<HopLogEntry[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  /** Análises acumuladas por área (handoff entre especialistas). */
  analises: Annotation<AnalisesPorArea>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  /** Última análise (atalho; relatório usa `analises`). */
  analise: Annotation<AnaliseEspecialista | null>,
  /** Destino roteado após o supervisor. */
  proximo: Annotation<ProximoNo>({
    reducer: (_left, right) => right,
    default: () => "relatorio",
  }),
  relatorioMarkdown: Annotation<string>,
  /** JID WhatsApp do contato (modo webhook). */
  remoteJid: Annotation<string>,
  /** Mensagem a enviar ao cliente via WhatsApp. */
  mensagemCliente: Annotation<string>,
  /** Canal de origem do ticket. */
  canal: Annotation<string>,
});

export type TriagemState = typeof TriagemAnnotation.State;

export function isWhatsAppMode(state: TriagemState): boolean {
  return Boolean(state.remoteJid?.trim());
}
