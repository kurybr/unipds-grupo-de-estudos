import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AnalisesPorArea,
  Categoria,
  HopLogEntry,
} from "./state.js";

export type MensagemHistorico = {
  role: "cliente" | "atendente";
  texto: string;
  timestamp: string;
};

export type SessaoStatus = "aberto" | "fechado";

export type SessaoChamado = {
  ticketId: string;
  pushName: string;
  remoteJid: string;
  status: SessaoStatus;
  categoria: Categoria | "";
  mensagens: MensagemHistorico[];
  analises: AnalisesPorArea;
  hopLog: HopLogEntry[];
  createdAt: string;
  updatedAt: string;
  ultimaMensagemId?: string;
};

const sessionsDir = path.join(import.meta.dirname, "../output/sessions");

function jidToFilename(remoteJid: string): string {
  return remoteJid.replace(/[^a-zA-Z0-9._-]/g, "_") + ".json";
}

function sessionPath(remoteJid: string): string {
  return path.join(sessionsDir, jidToFilename(remoteJid));
}

async function ensureSessionsDir(): Promise<void> {
  await mkdir(sessionsDir, { recursive: true });
}

export async function loadSession(
  remoteJid: string
): Promise<SessaoChamado | null> {
  try {
    const raw = await readFile(sessionPath(remoteJid), "utf8");
    return JSON.parse(raw) as SessaoChamado;
  } catch {
    return null;
  }
}

export async function saveSession(sessao: SessaoChamado): Promise<void> {
  await ensureSessionsDir();
  sessao.updatedAt = new Date().toISOString();
  await writeFile(sessionPath(sessao.remoteJid), JSON.stringify(sessao, null, 2), "utf8");
}

function newTicketId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WHA-${ts}-${rand}`;
}

export function createSession(
  remoteJid: string,
  pushName: string
): SessaoChamado {
  const now = new Date().toISOString();
  return {
    ticketId: newTicketId(),
    pushName: pushName || "Cliente WhatsApp",
    remoteJid,
    status: "aberto",
    categoria: "",
    mensagens: [],
    analises: {},
    hopLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function appendClienteMessage(
  sessao: SessaoChamado,
  texto: string
): SessaoChamado {
  return {
    ...sessao,
    mensagens: [
      ...sessao.mensagens,
      { role: "cliente", texto, timestamp: new Date().toISOString() },
    ],
  };
}

export function appendAtendenteMessage(
  sessao: SessaoChamado,
  texto: string
): SessaoChamado {
  return {
    ...sessao,
    mensagens: [
      ...sessao.mensagens,
      { role: "atendente", texto, timestamp: new Date().toISOString() },
    ],
  };
}

export function buildTicketFromSession(sessao: SessaoChamado): string {
  const transcript = sessao.mensagens
    .map((m) => `${m.role === "cliente" ? "Cliente" : "Atendente"}: ${m.texto}`)
    .join("\n");

  return [
    `ID: ${sessao.ticketId}`,
    `Cliente: ${sessao.pushName}`,
    "Canal: whatsapp",
    "",
    "---",
    "",
    transcript || "(sem mensagens)",
  ].join("\n");
}

export function formatTranscriptMarkdown(sessao: SessaoChamado): string {
  if (sessao.mensagens.length === 0) return "_sem transcrição_";
  return sessao.mensagens
    .map((m) => {
      const label = m.role === "cliente" ? "Cliente" : "Atendente";
      return `**${label}** (${m.timestamp}):\n> ${m.texto}`;
    })
    .join("\n\n");
}

export async function saveChamadoReport(
  ticketId: string,
  markdown: string
): Promise<string> {
  const chamadosDir = path.join(import.meta.dirname, "../output/chamados");
  await mkdir(chamadosDir, { recursive: true });
  const filePath = path.join(chamadosDir, `${ticketId}.md`);
  await writeFile(filePath, markdown.trimEnd() + "\n", "utf8");
  return filePath;
}
