# RR Manager

Sistema de gestão para oficinas, feito com HTML, CSS e JavaScript e sincronizado com Firebase.

## Fluxo principal

1. Cadastre clientes e veículos.
2. Crie pré-orçamentos e envie-os ao cliente.
3. Aprove, reprove, edite ou imprima os orçamentos.
4. Acompanhe receitas, despesas e saldo no financeiro.

## Dados e login

Cada empresa possui um workspace próprio no Firestore. A partir da versão 2, clientes, veículos, serviços, orçamentos e lançamentos financeiros são armazenados em documentos separados dentro de subcoleções. Isso evita o limite de 1 MiB do documento antigo e reduz conflitos entre computador e celular.

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

As regras garantem que cada usuário acesse apenas o workspace da própria empresa. O administrador definido nas regras pode consultar e gerenciar todos os workspaces.

## Aceite jurídico

As versões vigentes ficam em `LEGAL_TERMS_VERSION` e `LEGAL_PRIVACY_VERSION`, dentro de `firebase-sync.js`. Quando os textos forem alterados de forma relevante, aumente a versão correspondente para solicitar um novo aceite no próximo login.
