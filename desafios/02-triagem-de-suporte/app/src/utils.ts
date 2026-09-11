import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const agentsDir = join(dirname(fileURLToPath(import.meta.url)), "agents");

export function loadAgentPrompt(filename: string): string {
  return readFileSync(join(agentsDir, filename), "utf8");
}

export function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  if (content == null) return "";
  return JSON.stringify(content);
}

/** Extrai o primeiro objeto JSON de uma resposta de LLM (tolera fences). */
export function parseJsonFromLlm<T extends Record<string, unknown>>(
  raw: string
): T | null {
  const trimmed = raw.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFences) as T;
  } catch {
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFences.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
