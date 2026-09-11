import { ChatOpenRouter } from "@langchain/openrouter";

export type AgentModelKey =
  | "supervisor"
  | "cobranca"
  | "tecnico"
  | "comercial";

export function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY não definida. Copie .env.example para .env e preencha a chave."
    );
  }

  const defaultModel = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

  return {
    openRouterApiKey: apiKey,
    defaultModel,
    models: {
      supervisor: process.env.OPENROUTER_MODEL_SUPERVISOR ?? defaultModel,
      cobranca: process.env.OPENROUTER_MODEL_COBRANCA ?? defaultModel,
      tecnico: process.env.OPENROUTER_MODEL_TECNICO ?? defaultModel,
      comercial: process.env.OPENROUTER_MODEL_COMERCIAL ?? defaultModel,
    } satisfies Record<AgentModelKey, string>,
  };
}

export function createLlm(model: string) {
  const { openRouterApiKey } = getConfig();
  return new ChatOpenRouter({
    apiKey: openRouterApiKey,
    model,
    temperature: 0,
  });
}
