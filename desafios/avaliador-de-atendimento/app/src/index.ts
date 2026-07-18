import "dotenv/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createGraph } from "./graph.js";
import fs from "fs";
import path from "path";

const seedDir = path.join(import.meta.dirname, "../seed");
const promptPath = path.join(import.meta.dirname, "agents/avaliador-geral.md");
const outputDir = path.join(import.meta.dirname, "../output");
const outputPath = path.join(outputDir, "relatorio.html");

function listAttendants(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function loadConversations(attendantDir: string): {
  total: number;
  payload: string;
} {
  const files = fs
    .readdirSync(attendantDir)
    .filter((file) => file.endsWith(".txt"))
    .sort();

  const parts = files.map((file) => {
    const content = fs.readFileSync(path.join(attendantDir, file), "utf8");
    return `--- ${file} ---\n${content.trim()}`;
  });

  return {
    total: files.length,
    payload: parts.join("\n\n"),
  };
}

function extractContent(message: { content?: unknown } | undefined): string {
  if (!message) return "";
  return typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content, null, 2);
}

const prompt = fs.readFileSync(promptPath, "utf8");
const graph = createGraph();
const attendants = listAttendants(seedDir);

const blocks: string[] = [];

for (const attendant of attendants) {
  const attendantDir = path.join(seedDir, attendant);
  const { total, payload } = loadConversations(attendantDir);

  console.log(`Carregando ${attendant} (${total} atendimento(s))...`);

  blocks.push(
    [
      `===== Atendente: ${attendant} =====`,
      `Total de atendimentos: ${total}`,
      "",
      payload,
    ].join("\n")
  );
}

const humanMessage = [
  `Total de atendentes: ${attendants.length}`,
  "",
  blocks.join("\n\n"),
].join("\n");

console.log("Gerando relatório consolidado...");

const result = await graph.invoke({
  messages: [new SystemMessage(prompt), new HumanMessage(humanMessage)],
});

const reportBody = extractContent(result.messages.at(-1));

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório diário</title>
</head>
<body>
  <h1>Relatório diário de atendimentos</h1>
${reportBody}
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");

console.log(`\nRelatório gerado: ${outputPath}`);
console.log(`Atendentes processados: ${attendants.length}`);
