# Levantamento de Requisitos

## LAB 001 • Avaliador Inteligente de Atendimento

> **Status:** Em discussão
>
> Este documento representa o levantamento inicial de requisitos obtido durante os primeiros encontros do Laboratório de IA Aplicada.
>
> Seu objetivo é servir como base para discussão, refinamento e criação do backlog inicial do projeto.

---

# 📖 Objetivo

Construir um agente capaz de analisar automaticamente atendimentos realizados através do WhatsApp, gerando informações que auxiliem gestores na avaliação da qualidade dos atendimentos.

Além da construção da solução, este projeto tem como objetivo servir de laboratório para experimentação de tecnologias relacionadas à Inteligência Artificial Aplicada.

---



# 👥 Atores

Os seguintes atores participam do fluxo do sistema.

- Cliente
- Atendente
- Gestor
- Agente de IA

---



# 🔄 Fluxo Inicial

O fluxo inicialmente imaginado pelo grupo é:

1. O cliente inicia um atendimento via WhatsApp.
2. O atendimento ocorre normalmente.
3. O atendimento é considerado encerrado.
4. Um processo periódico identifica todos os atendimentos encerrados.
5. O Agente de IA analisa cada conversa.
6. O resultado da análise é armazenado.
7. Futuramente essas informações poderão ser consultadas através de um Dashboard.

```mermaid
flowchart TD
    A["1. Cliente inicia atendimento via WhatsApp"] --> B["2. Atendimento ocorre normalmente"]
    B --> C["3. Atendimento é encerrado"]
    C --> D["4. Processo periódico identifica atendimentos encerrados"]
    D --> E["5. Agente de IA analisa cada conversa"]
    E --> F["6. Resultado da análise é armazenado"]
    F -.-> G["7. Dashboard (futuro)"]

    style G stroke-dasharray: 5 5
```



> **Observação**
>
> Ainda precisamos definir quais critérios caracterizam um atendimento como encerrado.

---



# ✅ Requisitos Funcionais



## RF01

O sistema deve ler conversas provenientes do WhatsApp.

---



## RF02

O sistema deve identificar quais conversas estão aptas para análise.

> Critério ainda não definido.

---



## RF03

O sistema deve enviar uma conversa para análise utilizando um Agente de IA.

---



## RF04

O sistema deve gerar um resumo da conversa.

---



## RF05

O sistema deve realizar uma avaliação da qualidade do atendimento.

---



## RF06

O sistema deve identificar o sentimento presente durante a conversa.

---



## RF07

O sistema deve calcular o tempo total do atendimento.

> Uma das formas de entender que o atendimento encerrou, é quanto tempo a conversa está aberta

---



## RF08 ( descontinuada )

O sistema deve calcular o tempo entre as interações do atendente e do cliente.

---



## RF09

O sistema deve identificar a categoria do atendimento.

Exemplos:

- Suporte
- Comercial
- Financeiro
- Dúvidas
- Outros

---



## RF10

O sistema deve identificar se o problema do cliente foi resolvido.

---



## RF11

O sistema deve registrar o resultado da análise realizada.

---



# ⚙️ Requisitos Não Funcionais



## RNF01

A stack inicial do projeto será Node.js.

---



## RNF02

O runtime inicial para orquestração dos agentes será o LangGraph.

---



## RNF03

A arquitetura deverá permitir a substituição do modelo de IA utilizado.

---



## RNF04

O projeto será desenvolvido de forma Open Source.

---



## RNF05

Toda funcionalidade deverá possuir documentação suficiente para que desenvolvedores e Agentes de IA consigam compreender seu funcionamento.

---



## RNF06

O desenvolvimento utilizará Inteligência Artificial como ferramenta de apoio durante todas as etapas do projeto.

---



## RNF07

Sempre que possível, a arquitetura deverá favorecer baixo acoplamento entre componentes.

---



## RNF08

O projeto deverá evoluir continuamente através das contribuições da comunidade do laboratório.

---



# 📏 Critérios de Avaliação

Durante a análise das conversas, o agente deverá considerar, entre outros, os seguintes aspectos.

## Atendimento

- Qualidade do atendimento
- Cordialidade
- Educação
- Clareza da comunicação
- Formalidade

---



## Cliente

- Sentimento transmitido
- Indícios de satisfação

---



## Processo

- Tempo total do atendimento
- Tempo entre respostas
- Categoria do atendimento
- Resolução do problema

---



## Resultado esperado

A análise deverá produzir informações como:

- Resumo da conversa
- Avaliação geral
- Pontos positivos
- Oportunidades de melhoria

---



# 📌 Regras de Negócio (Em Discussão)

Os itens abaixo ainda precisam ser definidos pelo grupo.

A definição da **persona do cliente** é o ponto de partida: respondê-la primeiro ajuda a elaborar as demais regras — critérios de qualidade, categorias, encerramento de atendimento e escopo do MVP.

## RN01

Qual é a persona do nosso cliente?

> **Prioridade:** Esta é a primeira pergunta que o grupo deve responder. A persona define o contexto do laboratório e orienta as demais decisões deste documento.

---



## RN02

Como identificar que um atendimento foi encerrado?

---



## RN03

Quais critérios definem a qualidade de um atendimento?

---



## RN04

Como determinar que um problema foi realmente resolvido?

---



## RN05

Como categorizar um atendimento?

---



## RN06

Como calcular SLA?

---



## RN07

Quais tipos de atendimento existirão?

Exemplo:

- Comercial
- Suporte
- Financeiro
- Customer Success

---



# 🚫 Fora do Escopo do MVP

As funcionalidades abaixo foram levantadas durante o brainstorming, porém deverão ser discutidas em etapas futuras.

- Dashboard operacional
- Atendimento híbrido (IA + Humano)
- Atendimento totalmente realizado por IA
- Agentes especializados por área
- SLA configurável por categoria
- Múltiplos modelos de IA trabalhando em conjunto

---



# ❓ Questões para Discussão

Durante o refinamento dos requisitos, gostaríamos de responder às seguintes perguntas — **começando pela persona**, que serve de base para as demais:

- **Qual é a persona do nosso cliente?** *(ponto de partida)*
- O que caracteriza um atendimento encerrado?
- Quais informações são obrigatórias para uma análise?
- Como medir a qualidade de um atendimento?
- Quais informações devem ser armazenadas?
- Quais funcionalidades realmente fazem parte do MVP?
- Existe algum requisito importante que ainda não foi levantado?

---



# 🎯 Próximo Passo

O primeiro passo do refinamento é **definir a persona do nosso cliente**. Com ela definida, o grupo poderá validar e detalhar as demais regras de negócio.

Em seguida, os requisitos serão transformados em:

- Épicos
- Issues
- Backlog do Projeto
- Arquitetura Inicial

