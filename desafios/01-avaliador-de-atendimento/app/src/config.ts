export function getConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY não definida. Copie .env.example para .env e preencha a chave."
    );
  }

  return {
    openRouterApiKey: apiKey,
    model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  };
}
