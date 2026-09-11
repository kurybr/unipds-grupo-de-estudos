import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenRouter } from "@langchain/openrouter";
import { getConfig } from "./config.js";

export function createGraph() {
  const { openRouterApiKey, model } = getConfig();

  const llm = new ChatOpenRouter({
    apiKey: openRouterApiKey,
    model,
    temperature: 0,
    plugins: [
      { id: 'web', max_results: 10 }
    ]
  });

  const analyze = async (state: typeof MessagesAnnotation.State) => {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
  };

  return new StateGraph(MessagesAnnotation)
    .addNode("analyze", analyze)
    .addEdge(START, "analyze")
    .addEdge("analyze", END)
    .compile();
}
