import "dotenv/config";
import { ChatOpenRouter } from "@langchain/openrouter";

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';


// Runtime
import { createAgent } from "langchain";

const llm = new ChatOpenRouter({ 
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL
})


const agent = createAgent({
    model: llm,
    systemPrompt: `
    Você é um assistente pessoal de TI de um grupo de estudos da UNIPDS.
    E responda com sempre com uma pergunta.
    `.trim()
})


interface Message { 
    role: 'user' | 'assistant' | 'system';
    content: string;
}

async function callAgent(messages: any): Promise<string> { 

    
    console.log("==== Chamando o AGENTE ====\n");
    const result = await agent.invoke({ messages })

    return result.messages.at(-1)?.content as string;
} 


let messages: any = [];

async function sendMessage() {

    const rl = readline.createInterface({ input, output });
    const mensagem = await rl.question('Digite a sua mensagem: ');
    rl.close();

    if(mensagem == 'sair') { 
        return process.exit(0);
    }

    // Mensagem do usuário.
    messages.push({ role: 'user', content: mensagem })

    const response = await callAgent(messages);
    
    console.log({ response });

    // Mensagem do assistente.
    messages.push({ role: 'assistant', content: response })

    sendMessage();
}


sendMessage(); 


// let response = await callAgent(messages)

// messages.push({
//     role: 'assistant',
//     content: response
// })

// messages.push({
//     role: 'user',
//     content: "Qual é o meu nome ?"
// })


// response = await callAgent(messages)


// console.log('\n\n\n\n')
// console.log({ response })
// console.log('\n\n\n\n')



export const graph = agent.graph;