import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document } from "@langchain/core/documents";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


// https://github.com/kurybr/unipds-grupo-de-estudos/blob/main/rag/nexacloud_rag_atendimento.md

export const createEmbeddings = () => { 
    return new OpenAIEmbeddings({
        model: process.env.EMBEDDING_MODEL,
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
        },
    });
} 

let base: PGVectorStore | null = null;
export const connectDatabase = async () => { 

    if(base) return base;

    base = await PGVectorStore.initialize(createEmbeddings(), {
        postgresConnectionOptions: { 
            connectionString: process.env.PGVECTOR_URL 
        },
        tableName: 'rag_trechos',
        collectionTableName: "rag_colecoes",
        collectionName: 'unipds',
        dimensions: 1536,
        distanceStrategy: "cosine",
        scoreNormalization: "similarity",
    });

    /**
     * O HNSW monta um grafo entre esses vetores e a 
     * busca por cosseno percorre só os vizinhos mais próximos.
     */
    await base.createHnswIndex({ dimensions: 1536 });

    await base.pool.query(`
        CREATE TABLE IF NOT EXISTS rag_estado (
            chave text PRIMARY KEY,
            fingerprint text NOT NULL,
            total integer NOT NULL
        )
    `);

    return base;
} 


async function readData( ) { 

    const response = await fetch('https://raw.githubusercontent.com/kurybr/unipds-grupo-de-estudos/main/rag/nexacloud_rag_atendimento.md');
    const text = await response.text();

    const fingerprint = createHash("sha256")
    .update(process.env.EMBEDDING_MODEL as string)
    .update(text)
    .digest("hex");

    return { fingerprint, text };

}

export async function ingestData( ) { 
    const db = await connectDatabase();
    const { fingerprint, text } = await readData();

    interface Estado { 
        fingerprint: string;
        total: number;
    }

    const result = await db.pool.query<Estado>(
        "SELECT fingerprint, total FROM rag_estado WHERE chave = 'unipds'"
    );

    const fgprint: Estado | undefined = result.rows[0];

    if( fgprint?.fingerprint === fingerprint && fgprint?.total > 0) { 
        console.log(`Base RAG pronta no pgvector (${fgprint.total} trechos, sem reindexar).`);
        return;
    }

    /**
     * O construtor devolve um objeto RecursiveCharacterTextSplitter. Ele ainda não corta o texto.
     * Quem devolve os pedaços é o splitText, na linha seguinte. Ele retorna uma Promise<string[]>: um array de strings, cada uma com até 500 caracteres, e cada pedaço repete os 80 caracteres finais do anterior.
     */
    const splitter = new RecursiveCharacterTextSplitter({
        /**
         * Tamanho dos chucks
         */
        chunkSize: 500, 
        /**
         * Pega um pedaço da anterior, para saber como acabou o anterior, e não começar do zero
         * mantendo a continuidade do conteudo.
         */
        chunkOverlap: 80,
    });

    const parts = await splitter.splitText(text);

    const documents = parts.map((part) => new Document({
        pageContent: part,
        metadata: { source: 'nexacloud_rag_atendimento.md' },
    }));


    await db.pool.query(`DELETE FROM rag_trechos`);
    
    /**
     * O embedding entra dentro do addDocuments, na linha 120. O Document só carrega o texto.
     * O cliente é criado em createEmbeddings e entregue ao banco em PGVectorStore.initialize. A partir daí o PGVectorStore guarda esse cliente. Quando addDocuments recebe os documentos, ele manda o pageContent de cada um para a OpenRouter, recebe um vetor de 1536 números e grava esse vetor na coluna embedding de rag_trechos, junto com o texto e o metadata.
     * Na busca acontece o mesmo com a pergunta. similaritySearchWithScore transforma a consulta em um vetor e o pgvector compara esse vetor com os que já estão na tabela, usando cosseno.
     */
    await db.addDocuments(documents);

    await db.pool.query(
        `INSERT INTO rag_estado (chave, fingerprint, total)
         VALUES ($1, $2, $3)
         ON CONFLICT (chave) DO UPDATE
         SET fingerprint = EXCLUDED.fingerprint, total = EXCLUDED.total`,
        ['unipds', fingerprint, documents.length],
    );


}