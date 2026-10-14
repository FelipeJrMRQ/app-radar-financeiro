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

## Identidade visual (outubro/2026)

Os arquivos visuais aprovados no pacote `identidade_visual.zip` estão em `public/assets/brand`, em versões WebP compactas, sem os PNGs de vários megabytes.
A marca principal aparece no login e no cadastro; o símbolo, na navegação; e os fundos, apenas em áreas de destaque. O favicon usa o mesmo símbolo do radar.
Cores base estão parametrizadas em `src/styles.scss` e podem evoluir sem alterar contratos de API.

As imagens são locais e independentes de hospedagem externa. Consulte `docs/identidade-visual.md` para o inventário e instruções de substituição.

## Terceira entrega — categorias e lançamentos

Rotas Angular com lazy loading:

- `/categorias`: lista categorias de sistema e personalizadas, filtra por tipo e cadastra categorias próprias.
- `/lancamentos`: listagem de receitas/despesas com filtro por tipo e por conta. Renderização progressiva de até 30 itens por vez.
- `/lancamentos/novo`: cadastro com categoria compatível com o tipo, conta, descrição, valor decimal exato, data e observação.

Contratos usados: `GET/POST /espacos-financeiros/{id}/categorias` e `GET/POST /espacos-financeiros/{id}/lancamentos` (listagem admite `contaFinanceiraId`). Os endpoints são verificados na branch do PR #21 do backend.

**Regra preservada:** a categoria define RECEITA ou DESPESA. A API determina se o lançamento nasce confirmado ou previsto conforme a data do lançamento. O Angular não soma valores, não confirma automaticamente pagamentos por conta própria e não interpreta o espaço financeiro como uma opção de navegação.

**Limitação atual da API:** o endpoint de lançamentos não disponibiliza paginação por servidor, então a UI apenas limita a quantidade de itens renderizados. Uma paginação backend poderá ser proposta quando houver volume elevado.

Os testes automatizados cobrem os contratos de cadastro, isolamento do ID interno do espaço e conversão monetária sem floats. Os fluxos de edição, confirmação parcial e estorno serão etapas futuras, após validação dessa jornada.

## Campos monetários — máscara pt-BR

O cadastro de contas (saldo inicial) e de lançamentos (valor) utiliza a diretiva standalone
`src/app/shared/directives/moeda-br-input.directive.ts`. É compartilhada entre funcionalidades.

- Campo inicialmente vazio: `R$ 0,00` aparece apenas como placeholder.
- Ao focar: o placeholder desaparece e `R$ ` aparece sem criar um valor no `FormControl`.
- Ao digitar: o prefixo `R$ ` e o separador de milhar são formatados dinamicamente; vírgula é o separador decimal.
- Ao sair: a parte decimal é complementada até duas casas (ex.: `R$ 1.250,50`).
- Até **quatro casas decimais** são preservadas para compatibilidade com `DECIMAL(19,4)`, sem usar `parseFloat` ou `Number` para montar o valor.
- Saldo inicial admite sinal negativo, enquanto receitas e despesas exigem valor maior que zero.
- O `FormControl` contém somente o valor em pt-BR sem `R$ `. O service envia o valor decimal canônico (`"1250.50"`) à API.

Para novos formulários monetários, reutilizar `rfMoedaBr` e importar a diretiva no componente standalone.
Não duplicar manipulações de `input` por tela.

## Painel financeiro e obrigações (quarta etapa)

O dashboard `/` consome **dados reais** do endpoint consolidado
`GET /espacos-financeiros/{id}/relatorios/painel-financeiro?dataInicio&dataFim`,
com saldos confirmado/projetado por conta, obrigações a pagar e receber, atrasos e próximos vencimentos.
O gráfico utiliza `/contas-financeiras/{contaId}/fluxo-caixa`; a análise por categoria consulta
`/relatorios/despesas-por-categoria` somente até a data atual.

O lançamento único permite situação inicial `PREVISTO` mesmo quando já vencido; a confirmação
`CONFIRMADO` exige data não futura. Clientes legados sem o campo ainda usam a regra original,
por compatibilidade. Os lançamentos recorrentes usam o endpoint mensal existente
`POST /recorrencias-lancamentos`; os parcelamentos diretos em conta usam
`POST /parcelamentos-lancamentos` (nova migration do backend).

**Pré-requisito desta etapa:** rodar backend na branch
`chatgpt/painel-pendencias-obrigacoes` (base: `chatgpt/espaco-automatico-cadastro`).
Não executar o frontend desta branch contra o backend anterior, que ainda não oferece
o novo contrato do painel nem o parcelamento em conta.

**Limites explícitos:** Faturas de cartão não foram agregadas ao total a pagar nessa etapa;
compras de cartão e pagamentos de fatura precisam de integração contábil própria para não
contabilizar o mesmo gasto duas vezes. Valores de pendências descontam realizações
parciais pelo backend. O dashboard não recalcula saldos com JavaScript.

## Preferências individuais do dashboard

A personalização fica em `/configuracoes/painel` (menu desktop e atalho no dashboard mobile).
Cada usuário pode:
- Reordenar os cinco cards por arraste usando Pointer Events em mouse/touch, ou pelas setas acessíveis.
- Exibir ou ocultar qualquer card, inclusive todos; os ocultos continuam no editor.
- Salvar por JWT no backend, e restaurar a sequência/visibilidade padrão.

**Backend requerido:** branch `chatgpt/preferencias-painel-usuario`, baseada em
`chatgpt/painel-pendencias-obrigacoes`; Flyway cria `preferencias_painel_usuario`.
Endpoints `GET/PUT/DELETE /usuarios/me/preferencias-painel`.
Não há identificação do usuário na requisição, somente no token JWT.
Componente de acesso rápido permanece sempre visível para que nenhuma configuração
impeça recuperar o acesso às funcionalidades. Indicadores do topo associados aos cards
também respeitam a visibilidade. O frontend não armazena preferências no navegador.

A ordenação segue a sequência informada pela API em mobile (coluna) e desktop (grid).
