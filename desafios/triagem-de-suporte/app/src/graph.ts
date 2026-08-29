import { END, START, StateGraph } from "@langchain/langgraph";
import {
  especialistaCobrancaNode,
  especialistaComercialNode,
  especialistaTecnicoNode,
} from "./nodes/especialista.js";
import { relatorioNode } from "./nodes/relatorio.js";
import { respostaNode } from "./nodes/resposta.js";
import { routeBySupervisor, supervisorNode } from "./nodes/supervisor.js";
import { TriagemAnnotation } from "./state.js";

export function createGraph() {
  return new StateGraph(TriagemAnnotation)
    .addNode("supervisor", supervisorNode)
    .addNode("especialista_cobranca", especialistaCobrancaNode)
    .addNode("especialista_tecnico", especialistaTecnicoNode)
    .addNode("especialista_comercial", especialistaComercialNode)
    .addNode("resposta", respostaNode)
    .addNode("relatorio", relatorioNode)
    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", routeBySupervisor, {
      especialista_cobranca: "especialista_cobranca",
      especialista_tecnico: "especialista_tecnico",
      especialista_comercial: "especialista_comercial",
      resposta: "resposta",
      relatorio: "relatorio",
    })
    .addEdge("especialista_cobranca", "supervisor")
    .addEdge("especialista_tecnico", "supervisor")
    .addEdge("especialista_comercial", "supervisor")
    .addEdge("resposta", END)
    .addEdge("relatorio", END)
    .compile();
}

/** Grafo compilado exportado para LangGraph Studio / CLI (`langgraph.json`). */
export const graph = createGraph();
