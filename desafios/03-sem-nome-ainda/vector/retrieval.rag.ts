import { connectDatabase } from "./ingestion.rag.js";

export type ChuckRecovery = {
    content: string;
    source: string;
    score: number;
};


export async function retrieve(query: string, topK = 3): Promise<ChuckRecovery[]> {
    const store = await connectDatabase();
    const results = await store.similaritySearchWithScore(query, topK);

    return results.map((result) => {
        const [document, score] = result; 
        return {
            content: document.pageContent,
            source: String(document.metadata.source ?? "desconhecida"),
            score,
        }
    });
}


export function formatContext(chunks: ChuckRecovery[]) {
    if (chunks.length === 0) {
        return "CONTEXTO RECUPERADO:\nNenhum trecho encontrado na base.";
    }

    const blocks = chunks.map((chunk, index) => {
        return `[${index + 1}] fonte: ${chunk.source} (similaridade ${chunk.score.toFixed(2)})\n${chunk.content}`;
    });

    return `CONTEXTO RECUPERADO:\n${blocks.join("\n\n")}`;
}
