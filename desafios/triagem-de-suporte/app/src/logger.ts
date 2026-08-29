type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

function ts(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, scope: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const prefix = `[${ts()}] [${level.toUpperCase()}] [${scope}]`;
  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

export const log = {
  debug: (scope: string, message: string, data?: unknown) =>
    write("debug", scope, message, data),
  info: (scope: string, message: string, data?: unknown) =>
    write("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    write("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    write("error", scope, message, data),
};

/** Log padronizado de entrada/saída de agentes no grafo. */
export const agentLog = {
  enter: (
    agent: string,
    ticketId: string,
    data?: Record<string, unknown>
  ) => log.info(agent, "→ entrando", { ticketId, ...data }),

  llmStart: (agent: string, ticketId: string, model: string) =>
    log.info(agent, "chamando LLM...", { ticketId, model }),

  llmDone: (
    agent: string,
    ticketId: string,
    elapsedMs: number,
    preview?: string
  ) =>
    log.info(agent, "LLM respondeu", {
      ticketId,
      elapsedMs,
      preview: preview?.slice(0, 200),
    }),

  decision: (
    agent: string,
    ticketId: string,
    data: Record<string, unknown>
  ) => log.info(agent, "decisão", { ticketId, ...data }),

  handoff: (
    from: string,
    to: string,
    ticketId: string,
    motivo?: string
  ) =>
    log.info("grafo", `handoff ${from} → ${to}`, {
      ticketId,
      motivo,
    }),

  exit: (
    agent: string,
    ticketId: string,
    data?: Record<string, unknown>
  ) => log.info(agent, "← saindo", { ticketId, ...data }),
};

export function summarizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return { type: typeof payload };
  }

  const p = payload as Record<string, unknown>;
  const data = p.data as Record<string, unknown> | undefined;
  const key = data?.key as Record<string, unknown> | undefined;
  const message = data?.message as Record<string, unknown> | undefined;

  return {
    event: p.event,
    instance: p.instance,
    remoteJid: key?.remoteJid,
    fromMe: key?.fromMe,
    messageId: key?.id,
    pushName: data?.pushName,
    messageKeys: message ? Object.keys(message) : [],
  };
}
