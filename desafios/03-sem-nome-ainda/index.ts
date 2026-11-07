import 'dotenv/config';
import { ChatOpenRouter } from '@langchain/openrouter';
import { END, MessagesValue, START, StateGraph, StateSchema, Send } from "@langchain/langgraph";
import { AIMessage, HumanMessage } from 'langchain';


const llm = new ChatOpenRouter({ 
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
});


export const States = new StateSchema({
    messages: MessagesValue,
});

export type States = typeof States.State;


export function createGraph() { 
    const workflow = new StateGraph(States)
    .addNode('fun_a', async (state: States) => { 
        return {
            messages: [
                new HumanMessage("Olá, como posso ajudar você hoje?")
            ]
        }
    })
    .addNode('fun_b', async (state: States) => { 
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
        return {
            messages: [
                new AIMessage(`fun_b`)
            ]
        }
    })
    .addNode('fun_c', async (state: States) => { 
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
        return {
            messages: [
                new AIMessage(`fun_c`)
            ]
        }
    })
    .addNode('fun_d', async (state: States) => { 
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
        return {
            messages: [
                new AIMessage(`fun_d`)
            ]
        }
    })
    /**
     * Se um ramo for mais longo que o outro, 
     * o nó de junção precisa de defer: true, 
     * senão ele pode disparar quando o ramo curto chega e de novo quando o longo termina.
     */
    .addNode('fun_e', async(state: States) => { 
        return {
            messages: [
                new AIMessage(`fun_e`)
            ]
        }
    }) // <----- DEFER: true 
    .addNode('fun_f', async(state: States) => { 
        return {
            messages: [
                new AIMessage("A resposta é essa")
            ]
        }
    })
    .addNode('send_message', async(payload) => { 

        return {
            messages: [
                new AIMessage(`${payload.message}`)
            ]
        }
    }, { defer: true })
    .addEdge(START, 'fun_a')
    .addEdge('fun_a', 'fun_b') 
    .addEdge('fun_a', 'fun_c')
    .addEdge('fun_c', 'fun_d')
    /**
     * Para esperar as duas antes de seguir, o destino recebe a lista dos predecessores. 
     * Isso vira uma barreira: o nó seguinte só roda quando fun_b e fun_d terminaram.
     */
    .addEdge(['fun_b', 'fun_d'], 'fun_e')

    .addConditionalEdges("fun_e", (state) => { 
        return new Array(10)
        .fill("1")
        .map((message) => {
            const randomMessage = Math.random()
            return new Send("send_message", { message: `fun_e ${randomMessage}` })
        })
    })

    .addEdge('send_message', 'fun_f')
    .addEdge('fun_f', END)


    return workflow.compile();
}


export const graph = createGraph();