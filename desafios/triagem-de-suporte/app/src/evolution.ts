export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  tlsInsecure: boolean;
};

export function getEvolutionConfig(): EvolutionConfig {
  const apiUrl = (process.env.EVOLUTION_API_URL ?? "https://evolution.localhost").replace(
    /\/$/,
    ""
  );
  const apiKey = process.env.EVOLUTION_API_KEY ?? "";
  const instance = process.env.EVOLUTION_INSTANCE ?? "";

  if (!apiKey) {
    throw new Error(
      "EVOLUTION_API_KEY não definida. Preencha no .env para enviar mensagens."
    );
  }
  if (!instance) {
    throw new Error(
      "EVOLUTION_INSTANCE não definida. Preencha no .env com o nome da instância."
    );
  }

  return {
    apiUrl,
    apiKey,
    instance,
    tlsInsecure: process.env.EVOLUTION_TLS_INSECURE === "true",
  };
}

async function evolutionFetch(
  url: string,
  init: RequestInit,
  tlsInsecure: boolean
): Promise<Response> {
  const prevTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (tlsInsecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  try {
    return await fetch(url, init);
  } finally {
    if (tlsInsecure) {
      if (prevTls === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTls;
      }
    }
  }
}

/** Converte `5511999999999@s.whatsapp.net` → `5511999999999`. */
export function jidToNumber(remoteJid: string): string {
  return remoteJid.split("@")[0] ?? remoteJid;
}

export async function sendText(
  remoteJid: string,
  text: string,
  config?: EvolutionConfig
): Promise<void> {
  const cfg = config ?? getEvolutionConfig();
  const number = jidToNumber(remoteJid);
  const url = `${cfg.apiUrl}/message/sendText/${encodeURIComponent(cfg.instance)}`;

  const { log } = await import("./logger.js");
  log.debug("evolution", "sendText", { url, number, textLength: text.length });

  const response = await evolutionFetch(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.apiKey,
      },
      body: JSON.stringify({ number, text }),
    },
    cfg.tlsInsecure
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Evolution sendText falhou (${response.status}): ${body.slice(0, 300)}`
    );
  }
}

export type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
    };
  };
};

const MESSAGE_EVENTS = new Set([
  "messages.upsert",
  "MESSAGES_UPSERT",
]);

export function isMessageUpsertEvent(event: string | undefined): boolean {
  if (!event) return false;
  return MESSAGE_EVENTS.has(event);
}

export function extractMessageText(
  payload: EvolutionWebhookPayload
): string | null {
  const message = payload.data?.message;
  if (!message) return null;

  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }

  const extended = message.extendedTextMessage?.text;
  if (typeof extended === "string" && extended.trim()) {
    return extended.trim();
  }

  return null;
}

export function shouldIgnoreWebhook(
  payload: EvolutionWebhookPayload
): string | null {
  if (!isMessageUpsertEvent(payload.event)) {
    return `evento ignorado: ${payload.event ?? "desconhecido"}`;
  }

  const key = payload.data?.key;
  if (!key?.remoteJid) {
    return "sem remoteJid";
  }

  if (key.fromMe) {
    return "mensagem própria (fromMe)";
  }

  if (key.remoteJid.endsWith("@g.us")) {
    return "grupo ignorado";
  }

  const text = extractMessageText(payload);
  if (!text) {
    return "sem texto (mídia ou tipo não suportado)";
  }

  return null;
}
