# Radar Financeiro — Angular

Frontend web **mobile first**, Angular 20, TypeScript e SCSS. Este projeto utiliza arquitetura por funcionalidades (Feature-Based) e consome a API Spring Boot do Radar Financeiro. O backend continua responsável por saldos, lançamentos e autorização.

## Pré-requisitos

- Node.js 22 LTS e npm.
- API `radar-financeiro-api` em execução em `http://localhost:8080`.
- Para cadastro automático e consulta do contexto do usuário, executar a **branch `chatgpt/espaco-automatico-cadastro` da API (PR #21)** enquanto ela não estiver integrada na main.

## Desenvolvimento local

```bash
npm ci
npm start
```

Acesse `http://localhost:4200`. O proxy do Angular recebe chamadas em `/api/*` e encaminha ao backend em `http://localhost:8080/*`. O proxy fica em `proxy.conf.json`, referenciado pelo `angular.json`. Em produção, o servidor HTTPS deve realizar o mesmo encaminhamento para `/api`, removendo o prefixo.

## Segunda entrega — contas financeiras

Rotas protegidas e mobile first:

- `/contas`: lista contas reais da API e consulta o saldo confirmado por conta.
- `/contas/nova`: cadastra nome, tipo e saldo inicial com formulário validado.
- `/contas/:contaId`: exibe saldo retornado pelo backend e extrato mensal com paginação por mês.

Os contratos foram verificados no controller/DTO de contas financeiras da API. Os valores monetários apresentados vêm do backend: **o Angular não calcula saldos ou totais**. O formulário converte `pt-BR` para string decimal e não utiliza `number` para construir o valor inicial.

A identidade visual destes módulos é provisória e seguirá a padronização do projeto futuramente. O desenho atual parte das larguras móveis e expande progressivamente. Nenhum dado financeiro fictício é apresentado.

## Primeira entrega

- Cadastro `POST /usuarios`.
- Login JWT `POST /auth/login`.
- Perfil `GET /usuarios/me`.
- Contexto interno `GET /espacos-financeiros/atual` sem expor gerenciamento de espaços.
- Rotas protegidas, interceptador HTTP, mensagens de erro e layout responsivo.
- Dashboard inicial sem valores financeiros simulados. Contas, extrato e demais funcionalidades virão nas próximas etapas.

**Sessão web provisória:** o JWT fica apenas em memória e é eliminado ao sair, expirar ou receber 401. Recarregar o navegador exige novo login. Essa decisão evita persistência insegura em `localStorage`/ `sessionStorage` enquanto não houver estratégia de autenticação web revisada. Antes da produção, revisar proteção contra XSS, CSP, renovação de sessão, políticas de cookies/HTTPS e a experiência de recarregamento.

## Qualidade

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

Validar visualmente em larguras **360 px, 768 px e desktop**. Não avançar sem aprovação; não fazer merge diretamente na `main`.

## Documentação de referência

- `Radar_Financeiro_Direcionamento_Angular_2026-10-13.md`
- `Radar_Financeiro_Diretrizes_Arquitetura_Frontend_Angular_2026-10-14.md`
- `Radar_Financeiro_Manual_Continuidade_2026-09-25.md`

Os documentos são mantidos nas fontes do projeto ChatGPT Radar Financeiro.
