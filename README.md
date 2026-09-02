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
| Peças, mão de obra, terceirizados e cortesias | Sim | Sim |
| PDFs, WhatsApp, aprovação e financeiro básico | Sim | Sim |
| DRE gerencial, metas, rankings e comparações | Não | Sim |
| Lançamentos financeiros recorrentes | Não | Sim |
| Até quatro colaboradores com permissões | Não | Sim |

Na condição de lançamento, o Essencial custa R$ 59,90 por mês durante 12 meses ou R$ 599 no primeiro período anual; depois, R$ 79,90 por mês ou R$ 799 por ano. O Pro custa R$ 99,90 por mês durante 12 meses ou R$ 999 no primeiro período anual; depois, R$ 119,90 por mês ou R$ 1.199 por ano. O painel administrativo sugere esses valores ao trocar plano ou ciclo, mas permite registrar uma condição comercial específica sem sobrescrever automaticamente contratos existentes.

## Dados e login

Cada empresa possui um workspace próprio no Firestore. A partir da versão 2, clientes, veículos, serviços, orçamentos e lançamentos financeiros são armazenados em documentos separados dentro de subcoleções. Isso evita o limite de 1 MiB do documento antigo e reduz conflitos entre computador e celular.

No Plano Pro, o responsável pode vincular até quatro contas de colaboradores. Cada pessoa entra com o próprio e-mail, compartilha o workspace da oficina e recebe apenas as coleções e ações autorizadas. Os vínculos ficam em `team_access` e as regras do Firestore validam plano, status e permissão em cada operação.

No primeiro acesso após a atualização, o sistema:

1. copia os registros antigos para as novas subcoleções;
2. confere se todos foram copiados;
3. ativa o formato 2;
4. no acesso seguinte, após nova conferência, remove as listas antigas do documento principal.

Se as novas regras ainda não estiverem publicadas, o sistema mantém temporariamente o formato anterior, sem apagar os dados.

## Configuração do Firebase

1. No Firebase Console, ative **Authentication > Email/senha**.
2. Crie o **Firestore Database** em modo de produção.
3. Registre um aplicativo Web.
4. Coloque o objeto de configuração em `firebase-config.js`.
5. Abra **Firestore Database > Regras**.
6. Copie todo o conteúdo de `firestore.rules`, cole no editor e clique em **Publicar**.

As regras garantem que cada usuário acesse apenas o workspace da própria empresa e, no caso dos colaboradores do Plano Pro, somente os módulos liberados. O administrador definido nas regras pode consultar e gerenciar todos os workspaces.

## Controle administrativo de cobranças

O painel administrativo mantém, em cada oficina, o início da assinatura, o último pagamento, o próximo vencimento, o valor esperado, a forma de pagamento, observações e o histórico de recebimentos. A situação é calculada pelas datas (teste grátis, em dia, próximo do vencimento, vence hoje ou em atraso), com opções manuais para teste grátis por 30 dias, cortesia e cancelamento. Testes, cortesias e cancelamentos possuem contadores e filtros próprios e não compõem o valor pendente enquanto não estiverem vencidos.

Ao registrar um recebimento, o vencimento pode avançar automaticamente em um mês ou um ano conforme o ciclo contratado. O painel também oferece resumo, filtros e uma mensagem de cobrança pronta para revisão no WhatsApp. A situação financeira não bloqueia a conta automaticamente: o estado da cobrança e a liberação de acesso são controles independentes. Os campos `billing` e `billingUpdatedAt` são reservados ao administrador pelas regras do Firestore.

Os recebimentos podem ser corrigidos ou excluídos pelo histórico. O painel soma esses registros no total recebido geral e no total da assinatura de cada oficina, sem misturá-los ao Financeiro ou ao DRE operacional da oficina cliente.

O administrador é direcionado para `admin.html`, uma central dedicada com indicadores de oficinas, planos, colaboradores, clientes gerenciados e orçamentos. A visão financeira combina os pagamentos de assinatura registrados com os gastos administrativos salvos em `admin_platform/finance`, apresentando resultado mensal, receita mensal estimada, projeção anual, recebimentos previstos para 30 dias e evolução dos últimos seis meses. Esses dados administrativos só podem ser lidos e alterados pelo e-mail administrador definido nas regras.

## Aceite jurídico

As versões vigentes ficam em `LEGAL_TERMS_VERSION` e `LEGAL_PRIVACY_VERSION`, dentro de `firebase-sync.js`. Quando os textos forem alterados de forma relevante, aumente a versão correspondente para solicitar um novo aceite no próximo login.
