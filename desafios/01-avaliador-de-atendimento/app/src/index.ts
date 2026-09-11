import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createGraph } from "./graph.js";
import { streaming } from "./streaming.js";

const prompt = `
# Rules:
- Responda em português brasileiro.
- Não invente informações, apenas retorne o que foi solicitado.
- se não encontrar devolva que não sabe.
`;

const message = `
Acesse esse link 
https://www.reclameaqui.com.br/empresa/drogarias-mais-saude/

Agrupe por problemas mais frequentes:
[ Problema ] [ Quantidade de reclamações ]

`;

const graph = createGraph();

const stream = await graph.stream(
  {
    messages: [new SystemMessage(prompt), new HumanMessage(message)],
  },
  { streamMode: "messages" }
);

let reasoningStarted = false;
let finalContent = "";

console.log("Streaming...");

try {
  for await (const [chunk] of stream) {
    const reasoning = chunk.additional_kwargs.reasoning_content;

    if (reasoning) {
      if (!reasoningStarted) {
        process.stdout.write("\n--- Reasoning ---\n");
        reasoningStarted = true;
      }
      streaming(reasoning as string);
    }

    const content = typeof chunk.content === "string" ? chunk.content : "";

    if (content) {
      finalContent += content;
    }
  }

  process.stdout.write("\n");

  await writeFile("output.md", finalContent.trimEnd() + "\n", "utf8");
  console.log("Resposta salva em output.md");
} catch (error) {
  console.error("\n\n--- Erro durante o streaming ---");
  console.error(error);
  process.exitCode = 1;
}
