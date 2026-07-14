# RR Reparação Manager

Sistema de gestão para oficina mecânica feito com HTML, CSS e JavaScript puro.

## Fluxo principal

1. Cadastre um cliente em `clientes.html`.
2. No cadastro do cliente, adicione um ou mais carros.
3. Crie um pré-orçamento em `orcamentos.html`, escolhendo o cliente e o carro.
4. No `dashboard.html`, aprove, reprove, edite ou imprima o orçamento.
5. Quando um orçamento é aprovado, a receita entra automaticamente no financeiro.
6. Em `financeiro.html`, lance também receitas e despesas manuais quando precisar.

## Orçamentos

O orçamento trabalha com:

- status inicial sempre `Pré-orçamento`;
- aprovação ou reprovação feita pelo dashboard;
- peças com quantidade, custo, valor unitário e total;
- serviços com horas, valor/hora editável e total;
- valor/hora padrão de R$ 120,00;
- valor final manual para ajustar o total quando necessário;
- impressão do orçamento pelo navegador.

## Financeiro

O financeiro calcula:

- receitas automáticas de orçamentos aprovados;
- receitas manuais, como entrada de dinheiro no caixa;
- custo de peças dos orçamentos aprovados;
- despesas manuais, como pró-labore, contas, prejuízos e saídas de caixa;
- lucro estimado;
- relatório por período, agrupado mês a mês.

## Dados e login

O sistema mantém uma cópia local no LocalStorage do navegador e sincroniza com Firebase quando o login está configurado.

No login existe a opção `Lembrar meu acesso neste computador`. Use essa opção apenas em computador pessoal.

## Firebase

Para ativar login e banco online:

1. Acesse `https://console.firebase.google.com`.
2. Crie um projeto.
3. Em Authentication, ative o provedor `Email/password`.
4. Em Firestore Database, crie um banco em modo de produção.
5. Registre um app Web no Firebase.
6. Copie o objeto `firebaseConfig`.
7. Cole os dados no arquivo `firebase-config.js`.

Use estas regras no Firestore. Troque `admin@rrreparacao.com.br` se mudar o e-mail admin em `firebase-config.js`.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn()
        && request.auth.token.email in ['admin@rrreparacao.com.br'];
    }

    function isWorkspaceOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    match /workspaces/{userId} {
      allow read: if isWorkspaceOwner(userId) || isAdmin();

      allow create: if isWorkspaceOwner(userId)
        && request.resource.data.owner == request.auth.uid
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.accessStatus == 'pending';

      allow update: if isWorkspaceOwner(userId)
        && request.resource.data.owner == resource.data.owner
        && request.resource.data.ownerUid == resource.data.ownerUid
        && request.resource.data.accessStatus == resource.data.accessStatus;

      allow delete: if isAdmin();
      allow create, update: if isAdmin();
    }

    match /public_orcamentos/{shareId} {
      // O endereço aleatório funciona como link de visualização para o cliente.
      allow read: if true;

      allow create: if isSignedIn()
        && request.resource.data.ownerUid == request.auth.uid;

      allow update, delete: if isSignedIn()
        && resource.data.ownerUid == request.auth.uid;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Com isso, cada usuário logado acessa apenas o próprio banco de dados.

### Publicar as regras

1. Abra o Firebase Console e selecione o projeto do RR Manager.
2. Entre em **Firestore Database > Regras**.
3. Copie todo o conteúdo de `firestore.rules`.
4. Substitua as regras exibidas no console.
5. Confirme se o e-mail de administrador é o mesmo de `firebase-config.js`.
6. Clique em **Publicar**.

### Aceite jurídico do primeiro acesso

As versões vigentes ficam nas constantes `LEGAL_TERMS_VERSION` e `LEGAL_PRIVACY_VERSION`, em `firebase-sync.js`. O aceite é salvo no campo `legalAcceptance` do documento da oficina em `workspaces/{uid}`. Ao alterar de forma relevante os documentos, atualize o texto, aumente a versão correspondente e publique o sistema. No próximo login, todos que ainda não aceitaram essa versão verão o modal novamente.
