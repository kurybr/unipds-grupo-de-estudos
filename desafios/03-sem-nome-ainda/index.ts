import "dotenv/config";
import { ChatOpenRouter } from "@langchain/openrouter";
import { tools } from "@langchain/openai";

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';


// Runtime
import { createAgent } from "langchain";
import { ListFiles, PokeTools, ReadFile } from "./tools.js";

const llm = new ChatOpenRouter({ 
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL
})


const agent = createAgent({
    model: llm,
    systemPrompt: `
    Você é um assistente pessoal de TI de um grupo de estudos da UNIPDS.
    E responda com sempre com uma pergunta.
    `.trim(),
    tools: [
        // tools.webSearch(
        //      {
        //          userLocation: { 
        //              type: "approximate",
        //              country: "BR",
        //              city: "Presidente Prudente",
        //              region: "São Paulo",
        //              timezone: "America/Sao_Paulo",
        //          }
        //      }
        // )
        PokeTools,
        ListFiles,
        ReadFile
    ]
})


async function callAgent(messages: any): Promise<string> { 

    const result = await agent.invoke({ 
        messages,  
     })

    return result.messages.at(-1)?.content as string;
} 


let context: any = [];

async function sendMessage() {

    const rl = readline.createInterface({ input, output });
    const mensagem = await rl.question('Digite a sua mensagem: ');
    rl.close();

    if(mensagem == 'sair') { 
        return process.exit(0);
    }

    // Mensagem do usuário.
    context.push({ role: 'user', content: mensagem })

    const response = await callAgent(context);
    
    console.log({ response });

    // Mensagem do assistente.
    context.push({ role: 'assistant', content: response })

    sendMessage();
}


sendMessage(); 

export const graph = agent.graph;