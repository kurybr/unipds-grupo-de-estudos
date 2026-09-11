import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  type AgentModelKey,
  createLlm,
  getConfig,
} from "../config.js";
import { agentLog } from "../logger.js";
import {
  type AnaliseEspecialista,
  type Categoria,
  type TriagemState,
} from "../state.js";
import { extractTextContent, loadAgentPrompt, parseJsonFromLlm } from "../utils.js";

type SpecialistOptions = {
  promptFile: string;
  areaLabel: string;
  modelKey: Exclude<AgentModelKey, "supervisor">;
  area: Categoria;
};

function formatHandoff(state: TriagemState, areaAtual: Categoria): string {
  const entries = Object.entries(state.analises ?? {}).filter(
    ([key]) => key !== areaAtual
  );
  if (entries.length === 0) {
    return "Nenhuma análise prévia de outro especialista.";
  }
  return entries
    .map(([area, a]) => {
      if (!a) return "";
      return [
        `### Especialista ${area}`,
        `- Diagnóstico: ${a.diagnostico}`,
        `- Prioridade: ${a.prioridade}`,
        `- Ação sugerida: ${a.acao_sugerida ?? "n/a"}`,
        `- Tags: ${(a.tags ?? []).join(", ") || "n/a"}`,
        `- Resposta rascunho: ${a.resposta_sugerida}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function createEspecialistaNode(options: SpecialistOptions) {
  const agentName = `especialista_${options.area}`;

  return async (state: TriagemState): Promise<Partial<TriagemState>> => {
    const handoffAreas = Object.keys(state.analises ?? {}).filter(
      (k) => k !== options.area
    );
    const isHandoff = handoffAreas.length > 0;

    agentLog.enter(agentName, state.ticketId, {
      area: options.areaLabel,
      hopSupervisor: state.hop,
      handoffDe: handoffAreas,
      justificativaSupervisor: state.supervisorResult?.justificativa,
    });

    const { models } = getConfig();
    const llm = createLlm(models[options.modelKey]);

    const systemPrompt = loadAgentPrompt(options.promptFile);
    const hopInfo = `Hop do supervisor atual: ${state.hop ?? 0}`;

    agentLog.llmStart(agentName, state.ticketId, models[options.modelKey]);
    const llmStartedAt = Date.now();

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        [
          `Área: ${options.areaLabel}`,
          `Ticket ID: ${state.ticketId}`,
          hopInfo,
          `Categoria dominante: ${state.categoria}`,
          `Justificativa do supervisor para te chamar: ${state.supervisorResult?.justificativa ?? "n/a"}`,
          `Modo colaborativo: ${isHandoff ? "sim — use o handoff" : "primeira análise da rodada"}`,
          "",
          "## Handoff de outros especialistas",
          formatHandoff(state, options.area),
          "",
          "## Ticket",
          state.ticket,
          "",
          isHandoff
            ? "Integre o handoff e foque no que falta da SUA área. A resposta_sugerida deve combinar com o relatório final."
            : "Foque na sua área.",
        ].join("\n")
      ),
    ]);

    const raw = extractTextContent(response.content);
    agentLog.llmDone(agentName, state.ticketId, Date.now() - llmStartedAt, raw);

    const parsed = parseJsonFromLlm<{
      diagnostico?: string;
      prioridade?: string;
      resposta_sugerida?: string;
      acao_sugerida?: string;
      tags?: unknown;
    }>(raw);

    const tags = Array.isArray(parsed?.tags)
      ? parsed!.tags!.map((t) => String(t))
      : [];

    const analise: AnaliseEspecialista = parsed
      ? {
          diagnostico: parsed.diagnostico ?? "Diagnóstico não informado.",
          prioridade: parsed.prioridade ?? "media",
          resposta_sugerida:
            parsed.resposta_sugerida ?? "Sem resposta sugerida.",
          acao_sugerida: parsed.acao_sugerida,
          tags,
        }
      : {
          diagnostico: "Falha ao parsear análise estruturada do especialista.",
          prioridade: "media",
          resposta_sugerida: raw,
          tags: ["parse-error"],
          raw,
        };

    agentLog.decision(agentName, state.ticketId, {
      diagnostico: analise.diagnostico,
      prioridade: analise.prioridade,
      acao_sugerida: analise.acao_sugerida,
      tags: analise.tags,
      respostaPreview: analise.resposta_sugerida.slice(0, 120),
      parseOk: Boolean(parsed),
    });

    agentLog.handoff(agentName, "supervisor", state.ticketId, "análise concluída");
    agentLog.exit(agentName, state.ticketId, { area: options.area });

    return {
      analise,
      analises: { [options.area]: analise },
    };
  };
}

export const especialistaCobrancaNode = createEspecialistaNode({
  promptFile: "especialista-cobranca.md",
  areaLabel: "Cobrança",
  modelKey: "cobranca",
  area: "cobranca",
});

export const especialistaTecnicoNode = createEspecialistaNode({
  promptFile: "especialista-tecnico.md",
  areaLabel: "Técnico",
  modelKey: "tecnico",
  area: "tecnico",
});

export const especialistaComercialNode = createEspecialistaNode({
  promptFile: "especialista-comercial.md",
  areaLabel: "Comercial",
  modelKey: "comercial",
  area: "comercial",
});
