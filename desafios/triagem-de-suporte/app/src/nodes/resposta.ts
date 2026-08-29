import { sendText } from "../evolution.js";
import { agentLog, log } from "../logger.js";
import type { TriagemState } from "../state.js";

const AGENT = "resposta";

export async function respostaNode(
  state: TriagemState
): Promise<Partial<TriagemState>> {
  agentLog.enter(AGENT, state.ticketId, {
    remoteJid: state.remoteJid,
    temMensagem: Boolean(state.mensagemCliente?.trim()),
  });

  const mensagem = state.mensagemCliente?.trim();
  if (!mensagem) {
    log.warn(AGENT, "mensagemCliente vazia; nada enviado", {
      ticketId: state.ticketId,
    });
    agentLog.exit(AGENT, state.ticketId, { enviado: false });
    return {};
  }

  if (!state.remoteJid) {
    log.warn(AGENT, "sem remoteJid; modo batch — mensagem não enviada", {
      ticketId: state.ticketId,
    });
    agentLog.exit(AGENT, state.ticketId, { enviado: false });
    return {};
  }

  log.info(AGENT, "enviando mensagem via Evolution", {
    ticketId: state.ticketId,
    remoteJid: state.remoteJid,
    preview: mensagem.slice(0, 120),
  });

  await sendText(state.remoteJid, mensagem);

  agentLog.exit(AGENT, state.ticketId, {
    enviado: true,
    preview: mensagem.slice(0, 120),
  });

  return {};
}
