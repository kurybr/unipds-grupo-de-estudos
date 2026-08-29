import { sendText } from "../evolution.js";
import { agentLog, log } from "../logger.js";
import {
  type AnaliseEspecialista,
  type Categoria,
  isWhatsAppMode,
  type TriagemState,
} from "../state.js";

const AREA_LABEL: Record<Categoria, string> = {
  cobranca: "Cobrança",
  tecnico: "Técnico",
  comercial: "Comercial",
};

function formatAnaliseSection(
  area: Categoria,
  analise: AnaliseEspecialista
): string[] {
  return [
    `### Análise — ${AREA_LABEL[area]}`,
    `- **Diagnóstico:** ${analise.diagnostico}`,
    `- **Prioridade:** ${analise.prioridade}`,
    `- **Ação sugerida:** ${analise.acao_sugerida ?? "n/a"}`,
    `- **Tags:** ${(analise.tags ?? []).join(", ") || "n/a"}`,
    "",
    "#### Resposta sugerida (desta área)",
    "",
    analise.resposta_sugerida,
    "",
  ];
}

const AGENT = "relatorio";

export async function relatorioNode(
  state: TriagemState
): Promise<Partial<TriagemState>> {
  const whatsapp = isWhatsAppMode(state);
  const areas = (Object.keys(state.analises ?? {}) as Categoria[]).filter(
    (k) => state.analises?.[k]
  );

  agentLog.enter(AGENT, state.ticketId, {
    whatsapp,
    areasAnalisadas: areas,
    hops: state.hop,
    trilha: (state.hopLog ?? []).map((h) => `#${h.hop}→${h.proximo}`).join(" "),
  });

  const supervisor = state.supervisorResult;
  const analises = state.analises ?? {};
  const isMulti = areas.length > 1;

  const hopOrder = (state.hopLog ?? [])
    .map((h) => h.proximo)
    .filter((p): p is Categoria => isCategoria(p));

  const orderedAreas = [
    ...hopOrder.filter((a, i, arr) => analises[a] && arr.indexOf(a) === i),
    ...areas.filter((a) => !hopOrder.includes(a)),
  ];

  const analysisBlocks = orderedAreas.flatMap((area) => {
    const a = analises[area];
    return a ? formatAnaliseSection(area, a) : [];
  });

  let respostaFinal: string;
  if (orderedAreas.length === 0) {
    respostaFinal = state.analise?.resposta_sugerida ?? "_sem resposta_";
  } else if (orderedAreas.length === 1) {
    respostaFinal =
      analises[orderedAreas[0]!]?.resposta_sugerida ?? "_sem resposta_";
  } else {
    respostaFinal = orderedAreas
      .map((area) => {
        const a = analises[area];
        return a ? `**[${AREA_LABEL[area]}]** ${a.resposta_sugerida}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  const hopTrail =
    (state.hopLog ?? [])
      .map(
        (h) =>
          `  ${h.hop}. → \`${h.proximo}\`${h.pronto ? " (pronto)" : ""} — ${h.justificativa}`
      )
      .join("\n") || "  (vazio)";

  const prioridade =
    orderedAreas
      .map((a) => analises[a]?.prioridade)
      .filter(Boolean)
      .join(", ") ||
    state.analise?.prioridade ||
    "n/a";

  const mensagemEncerramento = state.mensagemCliente?.trim() ?? "";

  if (whatsapp && mensagemEncerramento) {
    log.info(AGENT, "enviando mensagem de encerramento", {
      ticketId: state.ticketId,
      remoteJid: state.remoteJid,
      preview: mensagemEncerramento.slice(0, 120),
    });
    await sendText(state.remoteJid, mensagemEncerramento);
    log.info(AGENT, "encerramento enviado com sucesso", {
      ticketId: state.ticketId,
    });
  }

  agentLog.decision(AGENT, state.ticketId, {
    areas: orderedAreas,
    prioridade,
    respostaFinalPreview: respostaFinal.slice(0, 120),
    encerramentoEnviado: whatsapp && Boolean(mensagemEncerramento),
  });

  const lines = [
    `## Ticket: ${state.ticketId}`,
    "",
    "### Entrada",
    "```",
    state.ticket.trim(),
    "```",
    "",
    ...(whatsapp
      ? [
          "### Canal",
          `- **Origem:** ${state.canal || "whatsapp"}`,
          `- **Contato:** ${state.remoteJid}`,
          "",
          "### Mensagem de encerramento enviada ao cliente",
          "",
          mensagemEncerramento || "_não enviada_",
          "",
        ]
      : []),
    "### Triagem (supervisor em loop)",
    `- **Categoria dominante:** ${supervisor?.categoria ?? state.categoria ?? "n/a"}`,
    `- **Hops:** ${state.hop ?? 0}`,
    `- **Modo:** ${isMulti ? "colaborativo (multi-especialista + reavaliação)" : "simples"}`,
    `- **Confiança final:** ${supervisor?.confianca ?? "n/a"}`,
    `- **Última justificativa:** ${supervisor?.justificativa ?? "n/a"}`,
    "",
    "#### Trilha de decisões",
    hopTrail,
    "",
    ...analysisBlocks,
    "### Resposta unificada ao cliente",
    "",
    respostaFinal,
    "",
    `### Prioridades por área: ${prioridade}`,
    "",
    "---",
    "",
  ];

  const markdown = lines.join("\n");

  agentLog.exit(AGENT, state.ticketId, {
    markdownChars: markdown.length,
    areas: orderedAreas.length,
  });

  return {
    relatorioMarkdown: markdown,
  };
}

function isCategoria(value: string): value is Categoria {
  return value === "cobranca" || value === "tecnico" || value === "comercial";
}
