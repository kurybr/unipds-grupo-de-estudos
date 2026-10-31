# Base local do desafio 03

Esta base existe só para o agente deste desafio. O modelo não conhece estes fatos fora dos arquivos indexados.

## O que está indexado

Os arquivos em RAG/docs são quebrados em pedaços, transformados em embeddings e guardados no Postgres com pgvector.
O banco sobe no container db-pgvector, na porta 5433, database defaultdb.
A busca usa distância de cosseno e devolve os trechos mais próximos da pergunta.

## Fatos para testar a recuperação

O mascote do laboratório desta semana se chama Vetor.
A senha do quadro branco compartilhado é embedding-19.
O modelo de embedding usado na base é o configurado em OPENROUTER_EMBEDDING_MODEL.
Se essa variável não existir, o padrão é openai/text-embedding-3-small.
O tema obrigatório do desafio 03, depois de tools e MCP, é RAG.

## Como conversar com o agente

Perguntas sobre encontros, presença, mascote, senha do quadro ou sobre o que está nesta base devem ser respondidas com os trechos recuperados.
Se a pergunta não estiver nos documentos, o agente deve dizer que não encontrou na base.
Perguntas sobre pokémon, arquivos locais ou ferramentas continuam nas tools já existentes.
