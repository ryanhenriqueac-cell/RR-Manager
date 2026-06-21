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
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ['admin@rrreparacao.com.br'];
    }

    match /workspaces/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.accessStatus == 'pending';
      allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.accessStatus == resource.data.accessStatus;
      allow read, write: if isAdmin();
    }

    match /public_orcamentos/{shareId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

Com isso, cada usuário logado acessa apenas o próprio banco de dados.
