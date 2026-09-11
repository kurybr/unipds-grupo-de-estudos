import "dotenv/config";
import { createServer } from "node:http";
import { createGraph } from "./graph.js";
import {
  type EvolutionWebhookPayload,
  extractMessageText,
  shouldIgnoreWebhook,
} from "./evolution.js";
import { log, summarizePayload } from "./logger.js";
import {
  appendAtendenteMessage,
  appendClienteMessage,
  buildTicketFromSession,
  createSession,
  formatTranscriptMarkdown,
  loadSession,
  saveChamadoReport,
  saveSession,
  type SessaoChamado,
} from "./session.js";
import type { TriagemState } from "./state.js";

const graph = createGraph();
const port = Number(process.env.WEBHOOK_PORT ?? 3000);

/** Deduplicação em memória de message IDs recentes. */
const processedIds = new Set<string>();
const MAX_PROCESSED_IDS = 500;

function rememberMessageId(id: string): void {
  processedIds.add(id);
  if (processedIds.size > MAX_PROCESSED_IDS) {
    const first = processedIds.values().next().value;
    if (first) processedIds.delete(first);
  }
}

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as unknown;
}

function buildGraphInput(sessao: SessaoChamado): Partial<TriagemState> {
  return {
    ticketId: sessao.ticketId,
    ticket: buildTicketFromSession(sessao),
    categoria: sessao.categoria,
    supervisorResult: null,
    hop: 0,
    hopLog: sessao.hopLog,
    analises: sessao.analises,
    analise: null,
    proximo: "relatorio",
    relatorioMarkdown: "",
    remoteJid: sessao.remoteJid,
    mensagemCliente: "",
    canal: "whatsapp",
  };
}

async function applyGraphResult(
  sessao: SessaoChamado,
  result: TriagemState
): Promise<SessaoChamado> {
  let updated: SessaoChamado = {
    ...sessao,
    categoria: (result.categoria as SessaoChamado["categoria"]) || sessao.categoria,
    analises: { ...sessao.analises, ...(result.analises ?? {}) },
    hopLog: result.hopLog ?? sessao.hopLog,
  };

  const proximo = result.proximo ?? result.supervisorResult?.proximo;

  log.info("graph", "resultado do grafo", {
    ticketId: updated.ticketId,
    proximo,
    pronto: result.supervisorResult?.pronto,
    hop: result.hop,
    categoria: result.categoria,
    areasAnalisadas: Object.keys(result.analises ?? {}),
    mensagemClientePreview: result.mensagemCliente?.slice(0, 120),
  });

  if (proximo === "resposta" && result.mensagemCliente?.trim()) {
    updated = appendAtendenteMessage(updated, result.mensagemCliente.trim());
    updated.status = "aberto";
    log.info("sessao", "resposta enviada ao cliente; chamado permanece aberto", {
      ticketId: updated.ticketId,
    });
  }

  if (proximo === "relatorio" || result.supervisorResult?.pronto) {
    if (result.mensagemCliente?.trim()) {
      updated = appendAtendenteMessage(updated, result.mensagemCliente.trim());
    }

    const reportBody = [
      result.relatorioMarkdown?.trimEnd() ?? "",
      "",
      "### Transcrição da interação",
      "",
      formatTranscriptMarkdown(updated),
      "",
    ].join("\n");

    const reportPath = await saveChamadoReport(updated.ticketId, reportBody);
    updated.status = "fechado";
    log.info("sessao", "chamado encerrado e relatório salvo", {
      ticketId: updated.ticketId,
      reportPath,
    });
  }

  return updated;
}

async function processWebhook(payload: EvolutionWebhookPayload): Promise<void> {
  const summary = summarizePayload(payload);
  log.info("webhook", "payload recebido", summary);

  const ignoreReason = shouldIgnoreWebhook(payload);
  if (ignoreReason) {
    log.warn("webhook", `evento ignorado: ${ignoreReason}`, summary);
    return;
  }

  const key = payload.data!.key!;
  const messageId = key.id!;
  if (processedIds.has(messageId)) {
    log.warn("webhook", "mensagem duplicada ignorada", { messageId });
    return;
  }
  rememberMessageId(messageId);

  const remoteJid = key.remoteJid!;
  const pushName = payload.data?.pushName ?? "Cliente WhatsApp";
  const texto = extractMessageText(payload)!;

  let sessao = await loadSession(remoteJid);

  if (!sessao || sessao.status === "fechado") {
    sessao = createSession(remoteJid, pushName);
    log.info("sessao", "novo chamado criado", {
      ticketId: sessao.ticketId,
      remoteJid,
      pushName,
    });
  } else {
    sessao.pushName = pushName || sessao.pushName;
    log.info("sessao", "chamado existente reaberto para novo turno", {
      ticketId: sessao.ticketId,
      status: sessao.status,
      mensagens: sessao.mensagens.length,
    });
  }

  sessao = appendClienteMessage(sessao, texto);
  sessao.ultimaMensagemId = messageId;

  log.info("webhook", "iniciando grafo de agentes", {
    ticketId: sessao.ticketId,
    textoPreview: texto.slice(0, 120),
    turno: sessao.mensagens.filter((m) => m.role === "cliente").length,
  });

  const startedAt = Date.now();
  const result = (await graph.invoke(buildGraphInput(sessao))) as TriagemState;
  const elapsedMs = Date.now() - startedAt;

  log.info("webhook", "grafo finalizado", {
    ticketId: sessao.ticketId,
    elapsedMs,
    proximo: result.proximo,
  });

  sessao = await applyGraphResult(sessao, result);
  await saveSession(sessao);

  log.info("sessao", "sessão persistida", {
    ticketId: sessao.ticketId,
    status: sessao.status,
    totalMensagens: sessao.mensagens.length,
  });
}

function normalizePath(url: string | undefined): string {
  if (!url) return "/";
  const pathOnly = url.split("?")[0] ?? "/";
  if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
    return pathOnly.slice(0, -1);
  }
  return pathOnly;
}

const server = createServer(async (req, res) => {
  const path = normalizePath(req.url);
  const clientIp = req.socket.remoteAddress ?? "unknown";

  log.debug("http", "requisição recebida", {
    method: req.method,
    path,
    clientIp,
    url: req.url,
  });

  if (req.method === "GET" && path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "POST" && path === "/webhook") {
    let rawBody = "";
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      rawBody = Buffer.concat(chunks).toString("utf8");

      log.info("http", "POST /webhook recebido da Evolution", {
        clientIp,
        bodyBytes: rawBody.length,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: true }));

      const body = rawBody.trim()
        ? (JSON.parse(rawBody) as EvolutionWebhookPayload)
        : ({} as EvolutionWebhookPayload);

      void processWebhook(body).catch((err) => {
        log.error("webhook", "erro no processamento assíncrono", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      });
    } catch (err) {
      log.error("http", "erro ao parsear body do webhook", {
        message: err instanceof Error ? err.message : String(err),
        bodyPreview: rawBody.slice(0, 300),
      });
    }
    return;
  }

  log.warn("http", "rota não encontrada", { method: req.method, path });
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(port, () => {
  log.info("server", `webhook ouvindo em http://0.0.0.0:${port}/webhook`);
  log.info("server", `health check em http://0.0.0.0:${port}/health`);
  log.info("server", "configuração", {
    evolutionUrl: process.env.EVOLUTION_API_URL ?? "https://evolution.localhost",
    evolutionInstance: process.env.EVOLUTION_INSTANCE ?? "(não definida)",
    logLevel: process.env.LOG_LEVEL ?? "info",
  });
  log.info(
    "server",
    "dica: na Evolution, o evento do webhook deve ser MESSAGES_UPSERT (não CHATS_UPSERT)"
  );
});
