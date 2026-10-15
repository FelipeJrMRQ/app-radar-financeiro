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

## Estrutura interna das features (refatoração de outubro/2026)

Cada feature concentra páginas (`pages`), componentes reais (`components`), serviços (`services`),
modelos (`models`), utilitários (`utils`), estilos (`styles`) e suas rotas
(`<feature>.routes.ts`), conforme sua necessidade concreta.
O `app.routes.ts` compõe essas rotas e preserva o lazy loading.
O dashboard contém cinco widgets standalone, compatíveis com a ordem/visibilidade por usuário;
a coordenação dos dados financeiros continua na página e nos serviços existentes.

**Diretriz integral:** [docs/diretrizes-arquitetura-frontend-angular.md](docs/diretrizes-arquitetura-frontend-angular.md).
A cópia em Fontes deve ser substituída pelo MD atualizado de 14/10/2026.

## Navegação por grupos — Cadastros e Configurações

No desktop, o menu lateral diferencia as operações financeiras (Início e Lançamentos)
dos grupos expansíveis **Cadastros** (Contas financeiras, Categorias) e
**Configurações** (Personalizar painel, Meu perfil). No celular, os quatro destinos
inferiores são Início, Lançamentos, Cadastros e Configurações, sendo que as duas
últimas entradas abrem centrais de navegação mobile first.

Novas rotas: `/cadastros`, `/configuracoes` e `/configuracoes/perfil`.
As rotas antigas permanecem inalteradas. Não foram adicionados endpoints ou
migrações: perfil é somente leitura dos dados autenticados já carregados pelo
`AuthService`; cartões, edição do perfil, segurança e notificações aparecem
como futuras funcionalidades, sem links falsos.

Rotas e páginas novas pertencem às features `cadastros/` e `configuracoes/`.

## Ação flutuante de lançamento no celular

Em telas com largura inferior a 860px, a navegação inferior mantém quatro
destinos (Início, Lançamentos, Cadastros e Configurações). A criação é uma ação
distinta da consulta: o botão flutuante **Novo lançamento** abre
`/lancamentos/novo`, enquanto a aba **Lançamentos** continua abrindo a listagem.
O botão é ocultado na própria tela de cadastro e na visualização desktop.

A ação fica acima da barra inferior, com área de toque mínima de 58 px.
`layout/app-shell.scss` define as variáveis `--mobile-nav-height`,
`--mobile-fab-size` e `--mobile-fab-gap`: o padding inferior da
`.page-content` considera a soma dessas dimensões, um respiro adicional e
`env(safe-area-inset-bottom)`, permitindo que o último card role
**completamente acima** do botão. Não aplicar posicionamento fixo em cada feature.

A ação **Personalizar painel** foi retirada do cabeçalho do dashboard;
permanece em `Configurações → Personalização do painel`.

## Legibilidade dos cards do dashboard em celular

Os vencimentos das listas de contas a pagar/receber são exibidos em
`dd/MM` (por exemplo `20/10`) e preservam `dd/MM/aaaa` no
`title` e no rótulo acessível do elemento `time[datetime]`.
O utilitário `formatarDiaMes` não converte fuso horário.

As fontes, valores e totais foram ampliados; no celular a listagem de
saldos apresenta o nome da conta acima de **Confirmado** e
**Projetado**, em duas colunas legíveis.

Os widgets de dashboard têm altura limitada responsivamente. Listas de
pendências, contas e categorias e o corpo do gráfico fazem rolagem
vertical própria quando o conteúdo ultrapassa a altura disponível. O
título e, quando aplicável, o rodapé de total permanecem visíveis.
As áreas roláveis aceitam foco de teclado e rolagem por toque. Nenhuma
consulta, cálculo financeiro ou valor da API foi alterado.

## Recuperação da sessão após F5

A autenticação é JWT Bearer com expiração de 3600 segundos definida pelo backend.
O Angular conserva o JWT em memória e grava **apenas o token e o instante
absoluto de expiração** em \`sessionStorage\` da aba atual. Senhas, dados de usuário
e contexto financeiro não são persistidos no armazenamento do navegador.

Ao atualizar qualquer rota protegida, o \`authGuard\` aguarda
\`AuthService.restaurarSessao()\`: valida a expiração local e refaz as consultas
\`GET /usuarios/me\` e \`GET /espacos-financeiros/atual\` antes de permitir
a navegação. Requisições simultâneas compartilham a mesma restauração.
O logout e as falhas de autorização (401) removem a credencial armazenada.
Token ausente, corrompido ou expirado exige novo login; após autenticar,
o usuário retorna à rota interna que tentava abrir.

**Nota de segurança:** \`sessionStorage\` resolve F5 na aba, **não** oferece a
mesma proteção que um cookie \`HttpOnly\` contra scripts maliciosos/XSS,
nem renova o JWT expirado. A aplicação deve manter proteção contra XSS,
não armazenar senhas no navegador e, antes de um SaaS em produção, evoluir
o backend para refresh tokens revogáveis em cookie \`HttpOnly\`, \`Secure\`,
\`SameSite\` e proteção CSRF adequada. Fechar a aba encerra a persistência
daquela aba. Em ambientes que bloqueiem \`sessionStorage\`, o login continua
funcionando em memória e F5 exigirá novo login.

## Resumo limpo das pendências no dashboard

Os cards **Contas a receber** e **Contas a pagar** apresentam apenas o vencimento
(dd/MM), a descrição, o valor pendente e o indicador de atraso quando aplicável.
A linha secundária com o nome da conta financeira e da categoria foi removida
somente do dashboard para priorizar leitura em telas pequenas. O detalhamento
permanece em **Lançamentos**, sem alteração no modelo ou no contrato da API.
Os cards **Saldos das contas** e **Despesas por categoria** mantêm os nomes,
pois nesses componentes eles identificam os dados exibidos.

## Dashboard e totais mensais de Lançamentos

O dashboard exibe no máximo **cinco** lançamentos por card de recebimentos e pagamentos.
Os cards não possuem rolagem própria nem rodapé de total; a página inteira rola
normalmente. O botão **Ver lançamentos** abre o mês selecionado e o filtro correto
(`/lancamentos?tipo=RECEITA&mes=2026-10` ou `DESPESA`).

A listagem de Lançamentos mostra mês selecionável, filtro por tipo/conta,
registros do período e **Total lançado no período**, calculado pela API em
`GET /espacos-financeiros/{id}/lancamentos/resumo-periodo`.
O total é a soma dos valores originais dos lançamentos ativos do período (confirmados
e previstos) e **não** representa dinheiro efetivamente pago ou recebido. As
consultas `GET /lancamentos` recebem os mesmos filtros de
`dataInicio`, `dataFim`, `tipo` e `contaFinanceiraId`.
A listagem permanece completa, mesmo se o usuário escolher carregar apenas os 30
primeiros registros na UI.

**Dependência:** backend branch `chatgpt/resumo-periodo-lancamentos`
(empilhada sobre `chatgpt/preferencias-painel-usuario`). O Angular desta etapa
precisa dessa versão da API. Nenhuma migration nem regra contábil anterior foi alterada.

## Diagnóstico de versão do backend na tela de Lançamentos

O endpoint `GET /lancamentos/resumo-periodo` foi criado na branch
`chatgpt/resumo-periodo-lancamentos`. Ao iniciar um Angular novo contra
uma API anterior, a rota `/resumo-periodo` pode ser confundida com
`/lancamentos/{lancamentoId}` e retornar **400 Bad Request** porque a
palavra `resumo-periodo` não é um ID numérico.

O Angular trata falhas do resumo separadamente: mantém os lançamentos visíveis
e filtrados por mês/tipo/conta, exibe aviso de incompatibilidade e **não cria
totais locais ou artificiais**. O valor total só aparece depois que a API
atualizada responder corretamente.

Para validar a API em execução, com o JWT da própria sessão:
`GET /espacos-financeiros/{id}/lancamentos/resumo-periodo?dataInicio=2026-10-01&dataFim=2026-10-31&tipo=RECEITA`.
O retorno esperado na nova versão é HTTP 200 com `totalLancado`.
Os testes de MVC na API verificam a rota para RECEITA, DESPESA e Todos.


## Gerenciar lançamentos (edição, exclusão, confirmações)

A tela de Lançamentos e os cards Contas a receber / Contas a pagar possuem
menu de três pontos, implementado pela feature
`features/lancamentos/components/lancamento-acoes`:
**Editar**, **Confirmar** (somente o atual), **Realização parcial**,
**Ver realizações / Estornar** e **Excluir**. Excluir e estornar exigem
uma segunda confirmação explícita. Após mutações, os dados são recarregados
pelo serviço correspondente, sem cálculos financeiros locais.

A página lazy `/lancamentos/:lancamentoId/editar` permite a correção
individual inclusive de registros antigos. Somente séries previstas,
ativas e com data igual ou posterior a hoje oferecem a escolha
`Somente este` / `Este e os próximos`.
A edição em lote preserva os vencimentos; registros antigos e
realizações financeiras têm validações adicionais no backend.
O frontend usa o vínculo técnico de recorrência ou parcelamento,
não a descrição, para selecionar os endpoints.

**Obrigatório atualizar a API primeiro:** branch
`chatgpt/gestao-lancamentos-sequencias`. O backend tem os endpoints
`/parcelas-restantes` e os metadados de parcelas no DTO.
Sem ele, não testar operações em lote de parcelamentos.


## Correção mobile e confirmação integral sem digitação

Nos cards **Contas a receber** e **Contas a pagar**, os elementos de cada
linha são agrupados em três regiões: data, descrição e `due-end`
(valor + menu de três pontos). O menu não cria uma quarta coluna nem desce
sozinho no mobile (320–639 px). A rolagem permanece na página.

**Confirmar pagamento/recebimento** executa imediatamente a confirmação
integral do registro selecionado. O valor é obtido pelo backend sob lock e a
data efetiva é a data atual do `Clock` configurado na API. Não há formulário
de valor nem confirmação em lote. Um feedback acessível, no app shell, informa
o sucesso mesmo que o registro desapareça do dashboard de pendências.

**Pagamento/recebimento parcial** continua solicitando valor e data.
O menu **Ver realizações** exibe o histórico de pagamentos parciais e permite
estornar cada realização com uma segunda confirmação. Após confirmação
integral direta, o menu da lista de Lançamentos exibe **Desfazer confirmação**,
também com confirmação explícita; isso não serve para quitar/estornar parcelas
já realizadas parcialmente.

**Atualize o backend para a branch `chatgpt/confirmacao-rapida-estorno`**
antes de testar. Endpoints necessários:
- `POST /espacos-financeiros/{espacoId}/lancamentos/{id}/confirmacao-automatica`
- `POST /espacos-financeiros/{espacoId}/lancamentos/{id}/estorno-confirmacao`

A API permanece responsável pela integridade e pelos valores financeiros;
a interface não calcula baixas ou ajustes de saldo.
