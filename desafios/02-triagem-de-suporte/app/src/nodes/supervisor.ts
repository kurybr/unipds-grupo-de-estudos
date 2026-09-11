import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlm, getConfig } from "../config.js";
import { agentLog } from "../logger.js";
import {
  CATEGORIAS,
  type Categoria,
  isCategoria,
  isProximoNo,
  isWhatsAppMode,
  MAX_SUPERVISOR_HOPS,
  type ProximoNo,
  type SupervisorResult,
  type TriagemState,
} from "../state.js";
import { extractTextContent, loadAgentPrompt, parseJsonFromLlm } from "../utils.js";

const FALLBACK_CATEGORIA: Categoria = "comercial";

const MENSAGEM_ENCERRAMENTO_PADRAO =
  "Obrigado pelo contato! Seu chamado foi encerrado. Se precisar de algo mais, é só enviar uma nova mensagem.";

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

function buildMensagemEncerramento(state: TriagemState): string {
  const areas = CATEGORIAS.filter((c) => state.analises?.[c]);
  if (areas.length === 1) {
    const resposta = state.analises?.[areas[0]!]?.resposta_sugerida;
    if (resposta) {
      return `${resposta}\n\n${MENSAGEM_ENCERRAMENTO_PADRAO}`;
    }
  }
  return MENSAGEM_ENCERRAMENTO_PADRAO;
}

const AGENT = "supervisor";

function forceRelatorio(
  hop: number,
  categoria: Categoria,
  motivo: string,
  state: TriagemState
): Partial<TriagemState> {
  agentLog.decision(AGENT, state.ticketId, {
    hop,
    proximo: "relatorio",
    pronto: true,
    motivo: "forceRelatorio",
    justificativa: motivo,
  });

  const mensagemCliente = isWhatsAppMode(state)
    ? buildMensagemEncerramento(state)
    : "";

  const supervisorResult: SupervisorResult = {
    categoria,
    proximo: "relatorio",
    pronto: true,
    confianca: "media",
    justificativa: motivo,
    mensagem_cliente: mensagemCliente || undefined,
  };

  return {
    hop,
    proximo: "relatorio",
    categoria,
    mensagemCliente,
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
  const whatsapp = isWhatsAppMode(state);
  const areasFeitas = CATEGORIAS.filter((c) => state.analises?.[c]);

  agentLog.enter(AGENT, state.ticketId, {
    hop,
    whatsapp,
    areasFeitas,
    trilha: (state.hopLog ?? []).map((h) => `#${h.hop}→${h.proximo}`).join(" "),
  });

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
      `Limite de ${MAX_SUPERVISOR_HOPS} hops do supervisor atingido; fechando relatório.`,
      state
    );
  }

  if (areasFeitas.length >= CATEGORIAS.length) {
    return forceRelatorio(
      hop,
      categoriaAnterior,
      "Todas as áreas já analisaram; fechando relatório.",
      state
    );
  }

  const { models } = getConfig();
  const llm = createLlm(models.supervisor);
  const systemPrompt = loadAgentPrompt("supervisor.md");

  agentLog.llmStart(AGENT, state.ticketId, models.supervisor);
  const llmStartedAt = Date.now();

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      [
        `Ticket ID: ${state.ticketId}`,
        `Canal: ${state.canal || "offline"}`,
        `Modo WhatsApp (resposta ao cliente): ${whatsapp ? "sim" : "não"}`,
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
  agentLog.llmDone(AGENT, state.ticketId, Date.now() - llmStartedAt, raw);

  const parsed = parseJsonFromLlm<{
    categoria?: string;
    proximo?: string;
    pronto?: boolean;
    reconsultar?: boolean;
    confianca?: string;
    justificativa?: string;
    mensagem_cliente?: string;
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
      : whatsapp
        ? "resposta"
        : "relatorio";

  let pronto = Boolean(parsed?.pronto);
  let justificativa =
    parsed?.justificativa ??
    (parsed
      ? "Decisão normalizada pelo orquestrador."
      : `Falha ao parsear JSON do supervisor. Resposta: ${raw.slice(0, 200)}`);

  let mensagemCliente = (parsed?.mensagem_cliente ?? "").trim();
  const reconsultar = Boolean(parsed?.reconsultar);

  // 1ª visita: exige especialista
  if (hop === 1 && (proximo === "relatorio" || proximo === "resposta")) {
    proximo = isCategoria(categoria) ? categoria : FALLBACK_CATEGORIA;
    pronto = false;
    mensagemCliente = "";
    justificativa = `${justificativa} (forçado: 1ª visita precisa de especialista)`;
  }

  // Evita reconsultar a mesma área sem flag
  if (isCategoria(proximo) && state.analises?.[proximo] && !reconsultar) {
    const faltando = CATEGORIAS.filter(
      (c) => !state.analises?.[c] && c !== proximo
    );
    if (faltando.length > 0 && hop < MAX_SUPERVISOR_HOPS) {
      const anterior = proximo;
      proximo = faltando[0]!;
      pronto = false;
      mensagemCliente = "";
      justificativa = `${justificativa} (evitou reconsulta de ${anterior}; redirecionado para ${proximo})`;
    } else if (whatsapp) {
      proximo = pronto ? "relatorio" : "resposta";
      if (proximo === "relatorio" && !mensagemCliente) {
        mensagemCliente = buildMensagemEncerramento(state);
      }
      justificativa = `${justificativa} (área já analisada; ${proximo === "relatorio" ? "encerrando" : "respondendo"})`;
    } else {
      proximo = "relatorio";
      pronto = true;
      justificativa = `${justificativa} (área já analisada; fechando)`;
    }
  }

  // Modo batch: resposta vira relatório
  if (!whatsapp && proximo === "resposta") {
    proximo = "relatorio";
    pronto = true;
    mensagemCliente = "";
    justificativa = `${justificativa} (modo batch: resposta convertida em relatório)`;
  }

  if (pronto && proximo !== "resposta") {
    proximo = "relatorio";
  }

  if (proximo === "relatorio") {
    pronto = true;
    if (whatsapp && !mensagemCliente) {
      mensagemCliente = buildMensagemEncerramento(state);
    }
  }

  if (proximo === "resposta") {
    pronto = false;
    if (!mensagemCliente) {
      const ultimaAnalise = areasFeitas
        .map((a) => state.analises?.[a]?.resposta_sugerida)
        .filter(Boolean)
        .pop();
      mensagemCliente =
        ultimaAnalise ??
        "Olá! Recebemos sua mensagem e estamos analisando. Pode nos dar mais detalhes?";
    }
  }

  const supervisorResult: SupervisorResult = {
    categoria,
    proximo,
    pronto,
    confianca: parsed?.confianca ?? "baixa",
    justificativa,
    mensagem_cliente: mensagemCliente || undefined,
  };

  agentLog.decision(AGENT, state.ticketId, {
    hop,
    categoria,
    proximo,
    pronto,
    confianca: supervisorResult.confianca,
    justificativa,
    mensagemClientePreview: mensagemCliente.slice(0, 120),
    llmRawProximo: parsed?.proximo,
    reconsultar,
  });

  if (isCategoria(proximo)) {
    agentLog.handoff(AGENT, `especialista_${proximo}`, state.ticketId, justificativa);
  } else {
    agentLog.handoff(AGENT, proximo, state.ticketId, justificativa);
  }

  agentLog.exit(AGENT, state.ticketId, { proximo, pronto });

  return {
    hop,
    categoria,
    proximo,
    mensagemCliente,
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
  let destino: string;
  if (state.proximo === "resposta") {
    destino = "resposta";
  } else if (state.proximo === "relatorio" || state.supervisorResult?.pronto) {
    destino = "relatorio";
  } else if (isCategoria(state.proximo)) {
    destino = `especialista_${state.proximo}`;
  } else {
    destino = "relatorio";
  }

  agentLog.decision("router", state.ticketId, {
    proximo: state.proximo,
    destino,
    pronto: state.supervisorResult?.pronto,
  });

  return destino;
}
