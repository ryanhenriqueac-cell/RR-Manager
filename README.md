# RR Manager

Sistema de gestão para oficinas, feito com HTML, CSS e JavaScript e sincronizado com Firebase.

## Fluxo principal

1. Cadastre clientes e veículos.
2. Crie pré-orçamentos e envie-os ao cliente.
3. Aprove, reprove, edite ou imprima os orçamentos.
4. Acompanhe receitas, despesas e saldo no financeiro.

## Planos vigentes

| Recurso | Essencial | Pro |
| --- | :---: | :---: |
| Clientes, veículos, orçamentos e inspeções | Sim | Sim |
| Seleção padronizada de marca, modelo, motor e ano | Sim | Sim |
| Peças, mão de obra, terceirizados e cortesias | Sim | Sim |
| PDFs, WhatsApp, aprovação e financeiro básico | Sim | Sim |
| Operação e ordens de serviço da equipe | Não | Sim |
| Catálogo técnico de mão de obra por veículo | Não | Sim |
| DRE gerencial, metas, rankings e comparações | Não | Sim |
| Lançamentos financeiros recorrentes | Não | Sim |
| Até quatro colaboradores com permissões | Não | Sim |

Na condição de lançamento, o Essencial custa R$ 59,90 por mês durante 12 meses ou R$ 599 no primeiro período anual; depois, R$ 79,90 por mês ou R$ 799 por ano. O Pro custa R$ 99,90 por mês durante 12 meses ou R$ 999 no primeiro período anual; depois, R$ 119,90 por mês ou R$ 1.199 por ano. O painel administrativo sugere esses valores ao trocar plano ou ciclo, mas permite registrar uma condição comercial específica sem sobrescrever automaticamente contratos existentes.

## Dados e login

Cada empresa possui um workspace próprio no Firestore. A partir da versão 3, clientes, veículos, serviços, orçamentos, ordens de serviço e lançamentos financeiros são armazenados em documentos separados dentro de subcoleções. Isso evita o limite de 1 MiB do documento antigo, reduz conflitos entre computador e celular e permite aplicar acesso granular no servidor.

No Plano Pro, o responsável pode vincular até quatro contas de colaboradores. Cada pessoa entra com o próprio e-mail, compartilha o workspace da oficina e recebe apenas as coleções e ações autorizadas. Os vínculos ficam em `team_access` e as regras do Firestore validam plano, status e permissão em cada operação.

## Permissões da equipe

Os perfis sugeridos aplicam o princípio do menor privilégio e podem ser personalizados:

| Perfil | Acesso padrão |
| --- | --- |
| Atendente | Clientes, veículos, orçamentos e inspeções; sem custos, aprovação ou financeiro |
| Mecânico | Somente ordens atribuídas e inspeções técnicas; sem dados pessoais, preços, custos ou faturamento |
| Financeiro | Caixa, custos, DRE e exportações; sem cadastros pessoais dos clientes |
| Gerente | Operação, clientes, orçamentos, aprovações e análises; sem alterar o caixa, metas do DRE, equipe ou cadastro da oficina |

As permissões são separadas entre visualizar, gerenciar, excluir, aprovar, distribuir e exportar. A interface apenas oculta o que não deve aparecer; a proteção real também é repetida nas regras do Firestore. Dados pessoais usam `clientes`, a consulta básica usa `clientes_resumo`, custos internos usam `orcamento_custos` e a oficina executa serviços pela coleção sanitizada `ordens_servico`.

O proprietário continua sendo o único responsável por convites, bloqueios e alterações da equipe. Contas de colaboradores exigem e-mail verificado. Remoção do vínculo, bloqueio da oficina ou saída do Plano Pro encerra a sessão e limpa o cache operacional do navegador.

Na migração de segurança, links públicos antigos com identificadores curtos são invalidados. O próximo envio do orçamento cria automaticamente um link novo com identificador criptograficamente aleatório.

No primeiro acesso do proprietário após a atualização, o sistema:

1. copia e confere os registros antigos nas subcoleções;
2. cria resumos de clientes sem telefone, e-mail, documento ou endereço;
3. separa os custos privados dos orçamentos;
4. converte os colaboradores para a matriz de permissões versão 3;
5. publica configurações mínimas para a equipe e remove os dados legados somente após a verificação.

Na conversão, perfis antigos padronizados recebem os novos conjuntos conservadores. Isso evita manter liberações amplas que tinham outro significado na versão anterior. O proprietário pode revisar e personalizar cada colaborador na página Equipe após a migração.

Se as novas regras ainda não estiverem publicadas, o sistema mantém temporariamente o formato anterior, sem apagar os dados.

## Configuração do Firebase

1. No Firebase Console, ative **Authentication > Email/senha**.
2. Crie o **Firestore Database** em modo de produção.
3. Registre um aplicativo Web.
4. Coloque o objeto de configuração em `firebase-config.js`.
5. Abra **Firestore Database > Regras**.
6. Copie todo o conteúdo de `firestore.rules`, cole no editor e clique em **Publicar**.

As regras garantem que cada usuário acesse apenas o workspace da própria empresa e, no caso dos colaboradores do Plano Pro, somente os módulos liberados. O administrador definido nas regras pode consultar e gerenciar todos os workspaces.

## Veículos padronizados e lista pronta de mão de obra

A seleção normalizada com 999 configurações de veículos está disponível nos planos Essencial e Pro. O Plano Pro acrescenta a lista com 664 operações de oficina e os tempos publicados por veículo. A base de referência não atribui tempos automaticamente: cada combinação veículo, intervalo de anos e operação precisa ser revisada no painel administrativo e publicada individualmente. Rascunhos e itens desativados nunca aparecem para as oficinas.

Na tela Clientes, qualquer plano pode selecionar ou vincular o veículo à configuração exata, mantendo a alternativa de digitação manual. No orçamento Pro, o botão da lista pronta exibe somente tempos publicados e compatíveis com o veículo e o ano selecionados. Ao adicionar uma sugestão, descrição, horas e valor/hora continuam editáveis; o orçamento registra quando o tempo sugerido foi modificado.

O arquivo `data/vehicle-configs.json` é carregado ao preparar a seleção de veículos. O arquivo `data/labor-operations.json` é carregado separadamente somente para os fluxos de mão de obra autorizados e para o painel administrativo. Os tempos aprovados ficam na coleção global `labor_time_catalog`, protegida pelas regras do Firestore.

Nesta atualização, publique `firestore.rules` antes de liberar os novos arquivos do site. Depois, entre uma vez com a conta proprietária de cada oficina para concluir automaticamente a migração. Se o site for atualizado primeiro, o proprietário continua salvando no esquema 2 de forma compatível, mas os colaboradores permanecem bloqueados até que as regras sejam publicadas e a migração seja concluída.

## Controle administrativo de cobranças

O painel administrativo mantém, em cada oficina, o início da assinatura, o último pagamento, o próximo vencimento, o valor esperado, a forma de pagamento, observações e o histórico de recebimentos. A situação é calculada pelas datas (teste grátis, em dia, próximo do vencimento, vence hoje ou em atraso), com opções manuais para teste grátis por 30 dias, cortesia e cancelamento. Testes, cortesias e cancelamentos possuem contadores e filtros próprios e não compõem o valor pendente enquanto não estiverem vencidos.

Ao registrar um recebimento, o vencimento pode avançar automaticamente em um mês ou um ano conforme o ciclo contratado. O painel também oferece resumo, filtros e uma mensagem de cobrança pronta para revisão no WhatsApp. A situação financeira não bloqueia a conta automaticamente: o estado da cobrança e a liberação de acesso são controles independentes. Os campos `billing` e `billingUpdatedAt` são reservados ao administrador pelas regras do Firestore.

Os recebimentos podem ser corrigidos ou excluídos pelo histórico. O painel soma esses registros no total recebido geral e no total da assinatura de cada oficina, sem misturá-los ao Financeiro ou ao DRE operacional da oficina cliente.

O administrador é direcionado para `admin.html`, uma central dedicada com indicadores de oficinas, planos, colaboradores, clientes gerenciados e orçamentos. A visão financeira combina os pagamentos de assinatura registrados com os gastos administrativos salvos em `admin_platform/finance`, apresentando resultado mensal, receita mensal estimada, projeção anual, recebimentos previstos para 30 dias e evolução dos últimos seis meses. Esses dados administrativos só podem ser lidos e alterados pelo e-mail administrador definido nas regras.

Cada oficina é apresentada na ordem Acesso, Assinatura, Cobrança e Equipe. Testes encerrados ficam em uma fila de decisão e não são tratados como dívida. A receita recorrente estimada inclui somente assinaturas pagantes com situação em dia, próxima do vencimento, vencendo hoje ou atrasada. O painel também calcula ticket mensal médio, conversão de testes com histórico conhecido, recebimentos por plano, permite filtrar o financeiro por mês e exportar recebimentos, gastos e resumo em Excel.

## Aceite jurídico

As versões vigentes ficam em `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION` e `CONTRACT_VERSION`, dentro de `firebase-sync.js`. Quando os textos forem alterados de forma relevante, aumente a versão correspondente para solicitar um novo aceite autenticado ao proprietário. A documentação interna de conformidade fica em `docs/compliance`.
