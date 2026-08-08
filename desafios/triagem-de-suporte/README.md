# LAB 002 • Triagem Inteligente de Suporte

> Segunda iniciativa do Laboratório de IA Aplicada do Grupo de Estudos da Pós-Graduação UNIPDS.

---

# 📖 Contexto

Enquanto o LAB 001 explorou um agente único (grafo com um nó), o LAB 002 aprofunda o estudo de **orquestração multi-agente**: um supervisor classifica o ticket e roteia para subagentes especialistas.

A empresa fictícia do laboratório continua sendo a **LevelUp Games** — e-commerce de games (consoles, jogos e acessórios).

Este documento é a base do desafio e deve evoluir com o grupo.

---

# 🎯 Problema

Filas de suporte misturam cobrança, problemas técnicos e dúvidas comerciais no mesmo canal.

Triagem manual atrasa o atendimento, desgasta especialistas com tickets fora da alçada e gera erros de especialização (ex.: reembolso tratado como “dúvida de produto”).

---

# 💡 Objetivo

Construir um pipeline de agentes capaz de:

1. **Classificar** o ticket (cobrança, técnico ou comercial).
2. **Rotear** para um subagente especialista.
3. **Analisar** com persona e regras da área.
4. **Gerar** um relatório em Markdown com diagnóstico, prioridade e resposta sugerida.

O MVP processa tickets offline a partir de arquivos seed (sem integração WhatsApp/API de canal).

---

# 🔄 Fluxo

```text
Ticket
   │
   ▼
Supervisor  ◄─────────────────────────────┐
   │ decide proximo / pronto              │
   ├── especialista_* ────────────────────┘  (volta pro loop)
   └── relatorio → END
```

```mermaid
flowchart TD
  startNode[START] --> supervisor[supervisor]
  supervisor -->|proximo_especialista| esp[especialista]
  supervisor -->|pronto_ou_max_hops| report[relatorio]
  esp --> supervisor
  report --> endNode[END]
```

---

# 🤖 Papel de cada agente

| Agente | Responsabilidade |
|--------|------------------|
| **Supervisor** | Em **loop**: decide `proximo` (especialista ou relatório) e `pronto`. Anti-loop com `SUPERVISOR_MAX_HOPS` (padrão 5). |
| **Especialista Cobrança** | Reembolsos, cobrança duplicada, estorno, fatura, meios de pagamento. |
| **Especialista Técnico** | Defeitos, garantia, instalação, download, problemas de hardware/software. |
| **Especialista Comercial** | Disponibilidade, pré-venda, frete, prazos, dúvidas de compra. |
| **Relatório** | Formata análises + trilha de hops do supervisor. |

Após cada especialista, o fluxo **volta ao supervisor**, que reavalia handoffs e escolhe o próximo passo até `pronto: true` ou o limite de hops.

---

# 🧰 Stack

| Peça | Uso no MVP |
|------|------------|
| Node.js + TypeScript (ESM) | Runtime e tipagem |
| LangGraph | Grafo multi-agente + conditional edges |
| LangChain OpenRouter | LLM via OpenRouter |
| Prompts em Markdown | Um arquivo por agente em `app/src/agents/` |
| Seeds `.txt` | Tickets sintéticos em `app/seed/` |

---

# 🎓 Objetivos de aprendizagem

1. Padrão **supervisor–worker** em LangGraph.
2. **Estado compartilhado** entre nós e `addConditionalEdges`.
3. **Um prompt por agente** (persona + escopo + schema de saída).
4. Separar **roteamento** de **especialização**.
5. Batch offline + documentação como artefato do laboratório.

---

# ▶️ Como executar

```bash
cd desafios/triagem-de-suporte/app
cp .env.example .env   # preencher OPENROUTER_API_KEY
pnpm i                 # ou npm i
pnpm start             # ou npm start
```

Saída esperada: `app/output/triagem.md`.

## LangSmith Studio (visualização + debug)

1. Crie conta em [LangSmith](https://smith.langchain.com) e gere uma API key em **Settings → API Keys**.
2. No `.env`, preencha:

```bash
LANGSMITH_API_KEY=lsv2_pt_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=triagem-de-suporte
```

3. Instale deps e suba o Agent Server local:

```bash
npm i
npm run studio
```

4. Abra o link do Studio impresso no terminal (em geral algo como `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`).
5. Selecione o grafo **`triagem`**. No input, use o schema do state (não é chat livre). Exemplo em [`app/studio-input.example.json`](./app/studio-input.example.json).

> **Nota:** o Studio extrai o schema do grafo via TypeScript. Este projeto usa **TypeScript 5.x** (`~5.8.3`). TypeScript 7 remove os `.d.ts` em `lib/` e quebra a extração (`Failed to extract schema` / TSVFS).
>
> Se o terminal mostrar `No projects found to resolve tenant`, a `LANGSMITH_API_KEY` está ausente/inválida ou sem workspace — regere em [Settings](https://smith.langchain.com/settings) e reinicie o Studio.

Variáveis de ambiente:

| Variável | Descrição |
|----------|-----------|
| `OPENROUTER_API_KEY` | Chave da API OpenRouter (obrigatória) |
| `OPENROUTER_MODEL` | Fallback global (padrão: `openai/gpt-4o-mini`) |
| `OPENROUTER_MODEL_SUPERVISOR` | Modelo do supervisor (opcional) |
| `OPENROUTER_MODEL_COBRANCA` | Modelo do especialista de cobrança (opcional) |
| `OPENROUTER_MODEL_TECNICO` | Modelo do especialista técnico (opcional) |
| `OPENROUTER_MODEL_COMERCIAL` | Modelo do especialista comercial (opcional) |
| `LANGSMITH_API_KEY` | Chave LangSmith (obrigatória para Studio) |
| `LANGCHAIN_TRACING_V2` | `true` para enviar traços |
| `LANGCHAIN_PROJECT` | Nome do projeto no LangSmith |

Se a variável de modelo por agente não estiver definida, usa-se `OPENROUTER_MODEL`.

---

# 📁 Estrutura

```
triagem-de-suporte/
├── README.md
├── REQUISITOS.md
└── app/
    ├── package.json
    ├── langgraph.json     # config LangGraph CLI / Studio
    ├── studio-input.example.json
    ├── tsconfig.json
    ├── .env.example
    ├── README.md          # regras de seeds
    ├── seed/              # tickets sintéticos
    ├── output/            # gerado em runtime
    └── src/
        ├── index.ts
        ├── config.ts
        ├── state.ts
        ├── graph.ts       # exporta `graph` para o Studio
        ├── nodes/
        │   ├── supervisor.ts
        │   ├── especialista.ts
        │   └── relatorio.ts
        └── agents/
            ├── supervisor.md
            ├── especialista-cobranca.md
            ├── especialista-tecnico.md
            └── especialista-comercial.md
```

---

# 🔮 Fora do escopo do MVP

- Integração WhatsApp / Evolution API / Slack
- Tools web ou RAG
- Handoff humano real (só sugestão no relatório)
- Vários especialistas por ticket (escalonamento)
- UI / dashboard
- Testes E2E dependentes de LLM real

Veja [REQUISITOS.md](./REQUISITOS.md) para RF/RNF detalhados.

---

# 🔗 Relação com o LAB 001

| LAB 001 | LAB 002 |
|---------|---------|
| Avalia qualidade de atendimentos encerrados | Triagem de tickets antes/durante o suporte |
| Um agente, um nó no grafo | Supervisor + 3 subagentes + relatório |
| Saída HTML consolidada | Saída Markdown por ticket (batch) |
