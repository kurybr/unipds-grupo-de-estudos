import "dotenv/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createGraph } from "./graph.js";

import fs from "fs";
import path from "path";

const sampleConversation = await fs.readFileSync(path.join( './seed/06-longo-nota-ruim-atendimento-excelente.txt'), 'utf8');

const prompt = `
Você é um avaliador de atendimentos via WhatsApp.

Analise a conversa abaixo e responda em português com:
1. Resumo breve
2. Sentimento geral do cliente
3. Avaliação da qualidade do atendimento entre pessimo, ruim, regular, bom e excelente.
4. Dê uma nota de 1 a 5 para a qualidade do atendimento.


O relatório deve ser em formato de HTML para fácil visualização.

`.trim();

const graph = createGraph();
const result = await graph.invoke({
  messages: [
    new SystemMessage(prompt), // Define a ação.
    new HumanMessage(sampleConversation), // Conversa.
  ],
});

const lastMessage = result.messages.at(-1);
const content =
  typeof lastMessage?.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage?.content, null, 2);

console.log("--- Resultado da análise ---\n");
console.log(content);
