import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlm, getConfig } from "../config.js";
import {
  CATEGORIAS,
  type Categoria,
  isCategoria,
  isProximoNo,
  MAX_SUPERVISOR_HOPS,
  type ProximoNo,
  type SupervisorResult,
  type TriagemState,
} from "../state.js";
import { extractTextContent, loadAgentPrompt, parseJsonFromLlm } from "../utils.js";

const FALLBACK_CATEGORIA: Categoria = "comercial";

function formatAnalises(state: TriagemState): string {
  const entries = Object.entries(state.analises ?? {});
  if (entries.length === 0) {
    return "(ainda nenhuma — primeira decisão de roteamento)";
  }
  return entries
    .map(([area, a]) => {
      if (!a) return "";
      return [
        `### ${area}`,
        `- Diagnóstico: ${a.diagnostico}`,
        `- Prioridade: ${a.prioridade}`,
        `- Ação: ${a.acao_sugerida ?? "n/a"}`,
        `- Tags: ${(a.tags ?? []).join(", ") || "n/a"}`,
        `- Resposta rascunho: ${a.resposta_sugerida}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function forceRelatorio(
  hop: number,
  categoria: Categoria,
  motivo: string
): {
  hop: number;
  proximo: ProximoNo;
  categoria: Categoria;
  supervisorResult: SupervisorResult;
  hopLog: TriagemState["hopLog"];
} {
  const supervisorResult: SupervisorResult = {
    categoria,
    proximo: "relatorio",
    pronto: true,
    confianca: "media",
    justificativa: motivo,
  };
  return {
    hop,
    proximo: "relatorio",
    categoria,
    supervisorResult,
    hopLog: [
      {
        hop,
        proximo: "relatorio",
        pronto: true,
        justificativa: motivo,
      },
    ],
  };
}

export async function supervisorNode(
  state: TriagemState
): Promise<Partial<TriagemState>> {
  const hop = (state.hop ?? 0) + 1;
  const areasFeitas = CATEGORIAS.filter((c) => state.analises?.[c]);
  const categoriaAnterior: Categoria =
    isCategoria(String(state.categoria ?? ""))
      ? (state.categoria as Categoria)
      : isCategoria(String(state.supervisorResult?.categoria ?? ""))
        ? state.supervisorResult!.categoria
        : FALLBACK_CATEGORIA;


  if (hop > MAX_SUPERVISOR_HOPS) {
    return forceRelatorio(
      hop,
      categoriaAnterior,
      `Limite de ${MAX_SUPERVISOR_HOPS} hops do supervisor atingido; fechando relatório.`
    );
  }

  if (areasFeitas.length >= CATEGORIAS.length) {
    return forceRelatorio(
      hop,
      categoriaAnterior,
      "Todas as áreas já analisaram; fechando relatório."
    );
  }

  const { models } = getConfig();
  const llm = createLlm(models.supervisor);
  const systemPrompt = loadAgentPrompt("supervisor.md");

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      [
        `Ticket ID: ${state.ticketId}`,
        `Visita do supervisor (hop): ${hop} / máx ${MAX_SUPERVISOR_HOPS}`,
        `Áreas já consultadas: ${areasFeitas.join(", ") || "(nenhuma)"}`,
        `Histórico de decisões: ${
          (state.hopLog ?? [])
            .map((h) => `#${h.hop}→${h.proximo}`)
            .join("; ") || "(vazio)"
        }`,
        "",
        "## Análises já coletadas",
        formatAnalises(state),
        "",
        "## Ticket",
        state.ticket,
      ].join("\n")
    ),
  ]);

  const raw = extractTextContent(response.content);
  const parsed = parseJsonFromLlm<{
    categoria?: string;
    proximo?: string;
    pronto?: boolean;
    reconsultar?: boolean;
    confianca?: string;
    justificativa?: string;
  }>(raw);

  const rawCategoria = parsed?.categoria ?? "";
  const categoria: Categoria = isCategoria(rawCategoria)
    ? rawCategoria
    : categoriaAnterior;

  const rawProximo = parsed?.proximo ?? "";
  let proximo: ProximoNo = isProximoNo(rawProximo)
    ? rawProximo
    : hop === 1
      ? FALLBACK_CATEGORIA
      : "relatorio";

  let pronto = Boolean(parsed?.pronto);
  let justificativa =
    parsed?.justificativa ??
    (parsed
      ? "Decisão normalizada pelo orquestrador."
      : `Falha ao parsear JSON do supervisor. Resposta: ${raw.slice(0, 200)}`);

  const reconsultar = Boolean(parsed?.reconsultar);

  // 1ª visita: exige especialista
  if (hop === 1 && proximo === "relatorio") {
    proximo = isCategoria(categoria) ? categoria : FALLBACK_CATEGORIA;
    pronto = false;
    justificativa = `${justificativa} (forçado: 1ª visita precisa de especialista)`;
  }

  // Evita reconsultar a mesma área sem flag
  if (
    isCategoria(proximo) &&
    state.analises?.[proximo] &&
    !reconsultar
  ) {
    const faltando = CATEGORIAS.filter((c) => !state.analises?.[c] && c !== proximo);
    if (faltando.length > 0 && hop < MAX_SUPERVISOR_HOPS) {
      const anterior = proximo;
      proximo = faltando[0]!;
      pronto = false;
      justificativa = `${justificativa} (evitou reconsulta de ${anterior}; redirecionado para ${proximo})`;
    } else {
      proximo = "relatorio";
      pronto = true;
      justificativa = `${justificativa} (área já analisada; fechando)`;
    }
  }

  if (pronto) {
    proximo = "relatorio";
  }

  if (proximo === "relatorio") {
    pronto = true;
  }

  const supervisorResult: SupervisorResult = {
    categoria,
    proximo,
    pronto,
    confianca: parsed?.confianca ?? "baixa",
    justificativa,
  };

  return {
    hop,
    categoria,
    proximo,
    supervisorResult,
    hopLog: [
      {
        hop,
        proximo,
        pronto,
        justificativa,
      },
    ],
  };
}

export function routeBySupervisor(state: TriagemState): string {
  if (state.proximo === "relatorio" || state.supervisorResult?.pronto) {
    return "relatorio";
  }
  if (isCategoria(state.proximo)) {
    return `especialista_${state.proximo}`;
  }
  return "relatorio";
}
