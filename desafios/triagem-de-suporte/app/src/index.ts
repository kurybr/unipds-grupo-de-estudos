import "dotenv/config";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createGraph } from "./graph.js";

const seedDir = path.join(import.meta.dirname, "../seed");
const outputDir = path.join(import.meta.dirname, "../output");
const outputPath = path.join(outputDir, "triagem.md");

async function listTickets(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => entry.name)
    .sort();
}

const graph = createGraph();
const ticketFiles = await listTickets(seedDir);

if (ticketFiles.length === 0) {
  console.error(`Nenhum ticket .txt encontrado em ${seedDir}`);
  process.exitCode = 1;
  process.exit();
}

console.log(`Processando ${ticketFiles.length} ticket(s)...`);

const sections: string[] = [
  "# Relatório de Triagem — LevelUp Games",
  "",
  `Gerado em: ${new Date().toISOString()}`,
  `Total de tickets: ${ticketFiles.length}`,
  "",
  "---",
  "",
];

for (const file of ticketFiles) {
  const ticketId = file.replace(/\.txt$/i, "");
  const ticket = await readFile(path.join(seedDir, file), "utf8");

  console.log(`→ ${ticketId}`);

  const result = await graph.invoke({
    ticketId,
    ticket,
    categoria: "",
    supervisorResult: null,
    hop: 0,
    hopLog: [],
    analises: {},
    analise: null,
    proximo: "relatorio",
    relatorioMarkdown: "",
    remoteJid: "",
    mensagemCliente: "",
    canal: "offline",
  });

  sections.push(
    result.relatorioMarkdown?.trimEnd()
      ? result.relatorioMarkdown
      : `## Ticket: ${ticketId}\n\n_Relatório vazio._\n\n---\n`
  );
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, sections.join("\n").trimEnd() + "\n", "utf8");
console.log(`Relatório salvo em ${outputPath}`);
