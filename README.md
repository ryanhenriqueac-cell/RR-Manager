# RR Reparação Manager

Sistema inicial de gestão para oficina mecânica, feito com HTML, CSS e JavaScript puro.

## Como abrir

1. Abra a pasta do projeto.
2. Dê dois cliques em `dashboard.html`.
3. Use o menu lateral para acessar Clientes, Veículos, Serviços, Orçamentos e Financeiro.

## Como testar o fluxo principal

1. Cadastre um cliente em `clientes.html`.
2. No próprio cadastro do cliente, adicione um ou mais carros.
3. Crie um pré-orçamento em `orcamentos.html`, escolhendo o cliente e um dos carros cadastrados nele.
4. Volte para `dashboard.html` para aprovar, marcar como não aprovado, editar ou imprimir.
5. Lance somente despesas manuais em `financeiro.html`.
6. Confira receitas, custos, despesas e lucro em `financeiro.html`.

## Orçamentos

O orçamento trabalha com:

- status inicial sempre `Pré-orçamento`;
- aprovação ou reprovação feita pelo dashboard;
- lista de peças com quantidade, valor unitário e total;
- preço de custo das peças para cálculo financeiro interno;
- lista de serviços com horas, valor/hora editável e total;
- valor/hora padrão de R$ 120,00;
- resumo geral do orçamento;
- botão de impressão para salvar em PDF pelo navegador.

## Financeiro

As receitas não são lançadas manualmente. Elas nascem automaticamente quando um orçamento é aprovado.

No financeiro você lança apenas despesas manuais. O sistema calcula:

- receitas de orçamentos aprovados;
- custo de peças dos orçamentos aprovados;
- despesas manuais;
- lucro estimado.

## Onde os dados ficam salvos

Nesta primeira versão, os dados ficam no LocalStorage do navegador.

Isso significa que os dados ficam salvos apenas naquele navegador e computador. Antes de limpar o navegador, trocar de computador ou publicar uma nova versão, use a opção de backup no dashboard.

## Backup

No dashboard, use:

- `Exportar backup`: baixa um arquivo `.json` com os dados.
- `Importar backup`: restaura um arquivo `.json` exportado anteriormente.

## Próximos passos recomendados

1. Testar todos os cadastros com dados reais da oficina.
2. Ajustar campos que faltarem no dia a dia.
3. Criar impressão de orçamento.
4. Criar exportação em PDF.
5. Publicar no GitHub.
6. Evoluir para login e banco de dados online, como Firebase ou Supabase.
