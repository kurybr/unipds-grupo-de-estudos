# Seeds — regras do domínio

Tickets sintéticos da **LevelUp Games** (e-commerce de games).

## Formato sugerido

```text
ID: TKT-001
Cliente: Nome do Cliente
Canal: chat | email | whatsapp

---

Corpo da mensagem do cliente (PT-BR).
```

## Categorias esperadas (para validação manual do lab)

| Categoria | Exemplos |
|-----------|----------|
| cobranca | reembolso, cobrança duplicada, estorno, fatura |
| tecnico | defeito, garantia, instalação, download |
| comercial | estoque, pré-venda, frete, prazo de entrega |
| misto / ambíguo | combine problemas de duas áreas |

## Regras

- Português brasileiro
- Sem dados reais de pessoas
- Um ticket por arquivo `.txt`
- Nomes de arquivo descritivos, ex.: `01-cobranca-duplicada.txt`
