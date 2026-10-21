# Radar Financeiro — Diretrizes de Arquitetura do Frontend Angular

**Data:** 14/10/2026  
**Status:** diretriz arquitetural aprovada para o desenvolvimento do frontend  
**Repositório:** https://github.com/FelipeJrMRQ/app-radar-financeiro  
**Escopo:** organização do código, separação de responsabilidades, responsividade, integração com API e critérios de evolução

> **Orientação para retomada em novos chats:** este documento registra as convenções aprovadas para o frontend Angular do Radar Financeiro. Deve ser consultado juntamente com `Radar_Financeiro_Direcionamento_Angular_2026-10-13.md` e, para os contratos e regras de negócio, com `Radar_Financeiro_Manual_Continuidade_2026-09-25.md`. Antes de implementar, confirmar o estado real do repositório, branches, PRs, endpoints e testes. **Não fazer merge sem a aprovação explícita do proprietário do projeto.**

---

## 1. Decisão arquitetural

A aplicação utilizará **Angular + TypeScript**, com estrutura **orientada por funcionalidades (Feature-Based Architecture)**, componentes standalone e interface **responsiva, mobile first**.

A organização por funcionalidades está alinhada às recomendações do **Angular Style Guide** (https://angular.dev/style-guide), especialmente o princípio de agrupar arquivos relacionados a uma mesma funcionalidade. Os diretórios `core`, `shared` e `layout` são **convenções de organização**, não exigências do framework ou um padrão oficial rígido.

A arquitetura deve favorecer, nesta ordem:

1. Clareza e autonomia de manutenção.
2. Coesão por funcionalidade e baixo acoplamento entre módulos.
3. Tipagem, testes e facilidade de evolução.
4. Boa experiência desktop, tablet e celular.
5. Simplicidade: evitar camadas, bibliotecas e abstrações sem necessidade comprovada.

**Decisão explícita:** não implantar uma Clean Architecture completa no frontend, nem dividir todas as funcionalidades artificialmente em `domain`, `application`, `infrastructure` e `presentation`. Isso aumentaria a complexidade sem ganho proporcional no estágio atual. A arquitetura poderá evoluir se necessidades concretas justificarem a mudança.

## 2. Estrutura de referência

A estrutura abaixo é **um mapa de destino**, não uma ordem para criar todas as pastas agora. Diretórios e arquivos devem surgir conforme as funcionalidades forem implementadas.

```text
src/
└── app/
    ├── core/                       # Serviços e infraestrutura globais
    │   ├── auth/                   # Sessão, autenticação, guarda de rotas
    │   ├── http/                   # Cliente HTTP, interceptadores, erros
    │   └── config/                 # Configuração da aplicação/API
    │
    ├── shared/                     # Recursos genéricos reutilizáveis
    │   └── components/             # Botões, estados vazios etc., quando necessários
    │
    ├── layout/                     # Shell, navegação e layout adaptativo
    │
    ├── features/                   # Áreas funcionais do produto
    │   ├── autenticacao/
    │   ├── dashboard/
    │   ├── contas-financeiras/
    │   ├── categorias/
    │   ├── lancamentos/
    │   ├── movimentacoes/
    │   ├── transferencias/
    │   └── cartoes-credito/
    │
    ├── app.config.ts
    ├── app.routes.ts
    └── app.ts
```

A localização exata de uma funcionalidade, componente ou serviço deve seguir sua **responsabilidade real**, não uma árvore de diretórios imposta antes de existir código.

### 2.1. Responsabilidade de cada diretório

| Local | Responsabilidade | Evitar |
|---|---|---|
| `core/` | Infraestrutura usada por toda a aplicação: autenticação, sessão, interceptadores, configuração HTTP e tratamento transversal de erros. | Regras financeiras ou serviços específicos de uma tela. |
| `shared/` | Componentes, pipes, diretivas e utilitários **verdadeiramente compartilhados** por várias funcionalidades. | Colocar tudo em `shared` por conveniência ou promover recursos usados uma única vez. |
| `layout/` | Estrutura da aplicação autenticada: cabeçalho, menu, navegação mobile, containers e adaptação visual. | Acesso a dados de contas, lançamentos ou regras de domínio. |
| `features/<funcionalidade>/` | Telas, componentes, modelos, serviços de API, estados e rotas próprios daquela funcionalidade. | Dependências circulares e acesso direto à implementação interna de outra funcionalidade. |

### 2.2. Organização interna de uma funcionalidade — convenção consolidada

Para funcionalidades que **já possuem múltiplas telas ou responsabilidades**, utilizar diretórios internos orientados a responsabilidade, sempre dentro da própria feature. Esta convenção foi adotada na refatoração arquitetural da branch `chatgpt/refactor-organizacao-features` (PR #8), baseada em `chatgpt/personalizacao-dashboard`.

```text
features/
├── contas-financeiras/
│   ├── pages/
│   │   ├── contas-lista/
│   │   ├── conta-cadastro/
│   │   └── conta-detalhe/
│   ├── components/                # Apenas quando existirem componentes extraídos de verdade
│   ├── services/
│   ├── models/
│   ├── utils/
│   ├── styles/                    # Estilos compartilhados exclusivamente por esta feature
│   └── contas-financeiras.routes.ts
├── dashboard/
│   ├── pages/
│   │   ├── dashboard/
│   │   └── personalizar-painel/
│   ├── components/
│   │   ├── contas-receber/
│   │   ├── contas-pagar/
│   │   ├── saldos-contas/
│   │   ├── fluxo-caixa/
│   │   └── despesas-categoria/
│   ├── services/
│   ├── models/
│   ├── utils/
│   ├── styles/
│   └── dashboard.routes.ts
├── lancamentos/
├── categorias/
└── autenticacao/
```

**Responsabilidades:**

- `pages/`: componentes standalone que representam páginas ligadas a URLs, com HTML/SCSS/testes próximos ao TypeScript correspondente.
- `components/`: partes de interface com responsabilidade própria, extraídas de páginas quando trazem melhor coesão, manutenção ou reutilização. Não criar diretórios ou componentes vazios.
- `services/`: acesso HTTP e orquestração local da funcionalidade; testes junto dos serviços.
- `models/`: contratos, tipos e modelos associados ao contexto da feature.
- `utils/`: transformações de apresentação puras e específicas da feature; nunca cálculos financeiros de domínio duplicados.
- `styles/`: SCSS compartilhado **dentro da mesma feature** quando há reuso efetivo. Estilos específicos continuam próximos às suas páginas/componentes. Não criar um único SCSS global para todas as funcionalidades.
- `<feature>.routes.ts`: rotas da funcionalidade; o `app.routes.ts` apenas compõe as rotas de alto nível, preservando lazy loading e as URLs existentes.

**Convenção de nomes:** usar os nomes de diretórios `pages`, `components`, `services`, `models`, `utils` e `styles` de forma consistente; nomes de jornada, contexto, rotas e arquivos permanecem descritivos em português. Escolher a simplicidade: se uma feature pequena não precisar de uma pasta, ela pode permanecer enxuta.

**Estilização do dashboard:** ao extrair os cards em componentes standalone, o SCSS da feature pode precisar ser importado na folha global para alcançar as instâncias filhas em virtude do encapsulamento de estilo do Angular. Nessa hipótese, o arquivo SCSS **continua pertencendo à feature** e os seletores devem ficar estritamente limitados ao escopo `.dashboard`. Não espalhar seletores genéricos como `.panel` no projeto global. Gradualmente mover regras exclusivas para o SCSS de cada widget quando fizer sentido.

**Testes:** arquivos `.spec.ts` devem acompanhar o arquivo testado, e toda refatoração desse tipo precisa validar importações, lazy loading, template compilation, responsividade e funcionalidades existentes, sem alterar os contratos da API.

## 3. Convenções Angular e TypeScript

- Utilizar **standalone components** e APIs modernas e suportadas pela versão adotada do Angular.
- Configurar o roteamento com **Angular Router**; usar **lazy loading** nos pontos adequados para reduzir o carregamento inicial.
- Usar **HttpClient** e interceptadores para autenticação, erros comuns e configurações transversais.
- Preferir **injeção de dependências** e serviços com responsabilidades bem definidas.
- Utilizar **tipagem estrita**; não recorrer a `any` indiscriminadamente.
- Preferir **Reactive Forms** para formulários com validações e regras de interação mais complexas.
- Usar recursos reativos nativos do Angular (como **signals**) e **RxJS** conforme o problema exigir, sem adicionar um gerenciador global de estado por antecipação.
- Priorizar templates legíveis e manter lógica de apresentação enxuta. Extrair componentes quando houver reuso real ou ganho claro de legibilidade.
- Nomear arquivos e diretórios de forma consistente, descritiva e compatível com convenções atuais do Angular; preservar a terminologia de negócio em português quando apropriado.
- Evitar múltiplos frameworks visuais. A escolha entre Angular Material, PrimeNG ou componentes próprios **ainda não está definida** e deve considerar acessibilidade, manutenção, desempenho e experiência mobile.
- Confirmar a versão efetiva do Angular e do Node.js no início de cada etapa relevante. Em 14/10/2026, o `package.json` da `main` do repositório registra Angular **20.3.x**; isso não implica congelar a versão indefinidamente.

## 4. Princípios de dependência e reuso

1. **`core` concentra recursos transversais**, mas não se transforma em depósito de serviços de negócio.
2. **Cada feature é dona da sua implementação.** Um componente específico de contas financeiras pertence à feature de contas.
3. **`shared` deve ser genérico**, sem dependência de uma feature financeira específica. Mover para `shared` apenas após constatar reuso e uma responsabilidade realmente comum.
4. A comunicação entre features deve acontecer por contratos claros (rotas, serviços/fachadas ou interfaces compartilhadas bem delimitadas), evitando imports cruzados desordenados.
5. Evitar serviços globais gigantes, componentes de centenas de linhas sem motivo e estruturas por tipo de arquivo que espalhem uma única jornada por diversas pastas globais.
6. Não introduzir bibliotecas, padrões ou camadas apenas por tendência. Toda complexidade nova deve resolver um problema identificável.

## 5. Separação frontend e backend

O frontend **não é a fonte de verdade dos cálculos financeiros**. O backend existente continuará responsável por:

- Saldos confirmados e projetados, extratos e regras de consolidação.
- Lançamentos `PREVISTO` e `CONFIRMADO`, confirmações, realizações parciais e estornos.
- Transferências entre contas e seus efeitos contábeis.
- Compras, parcelamentos, faturas, pagamentos e prevenção de dupla contabilização.
- Autorização, isolamento entre usuários e espaços financeiros.

O Angular deverá **exibir dados retornados pela API, coletar entradas, validar aspectos de formulário e emitir comandos**, respeitando as respostas e restrições do backend. Não duplicar algoritmos financeiros em TypeScript.

### 5.1. Espaço financeiro invisível ao usuário

`EspacoFinanceiro` é um **contexto técnico interno** de isolamento lógico:

- O usuário final não cria, seleciona, renomeia ou alterna espaços financeiros.
- O cadastro cria automaticamente usuário, espaço e vínculo de proprietário, conforme a evolução da API prevista no **PR #21**.
- A aplicação autenticada consulta `GET /espacos-financeiros/atual` para obter o contexto interno.
- As rotas financeiras existentes usam o identificador do espaço em seus caminhos HTTP; isso **não deve aparecer como opção de navegação ou gestão na interface**.
- O backend sempre valida a autorização. Informar um ID pelo frontend nunca substitui a segurança do servidor.

**Dependência técnica:** em 14/10/2026, o PR #21 do backend ainda estava aberto; validar a branch/API realmente em execução antes de integrar esse fluxo.

### 5.2. Valores e datas

- Apresentar moeda e datas com convenções brasileiras (`pt-BR`, `BRL`) conforme os contratos.
- Preservar a precisão retornada pela API: o backend trabalha com `BigDecimal` / `DECIMAL(19,4)`. Evitar cálculos monetários de negócio com `number`/ponto flutuante do JavaScript.
- Para campos monetários, validar e converter a entrada com cuidado, conforme o contrato real de serialização da API.
- Não produzir saldo acumulado no browser quando o backend já fornece o extrato consolidado.
- Distinguir datas financeiras (`LocalDate`) de instantes de auditoria, evitando alterações indevidas por fuso horário.

## 6. Responsividade e experiência de uso

**Mobile first** significa desenhar as jornadas para telas pequenas desde o início — não simplesmente reduzir o layout desktop.

- **Celular:** navegação compacta, ações principais fáceis de tocar, formulários confortáveis, filtros recolhíveis e movimentações em listas/cartões legíveis.
- **Tablet:** layout intermediário conforme o espaço efetivamente disponível.
- **Desktop:** menu lateral quando fizer sentido, dashboards com múltiplos painéis e tabelas detalhadas.
- Utilizar CSS Grid/Flexbox e breakpoints consistentes baseados no espaço disponível.
- Garantir foco visível, navegação por teclado, rótulos acessíveis, contraste e estados de carregamento/erro/vazio.
- Evitar cortes, sobreposição de controles e rolagem horizontal indevida em fluxos essenciais.
- Validar visualmente as mesmas jornadas em desktop e celular antes de aprovar cada entrega.

## 7. Autenticação, segurança e cache

- Integrar-se à autenticação JWT existente na API Spring Boot.
- Definir estratégia própria para o navegador: **não copiar automaticamente a persistência de token do Flutter**.
- Enquanto a estratégia de sessão web não for revisada, evitar assumir que `localStorage` é a escolha definitiva para tokens.
- Centralizar envio de credenciais e tratamento de erros HTTP com mecanismos apropriados do Angular.
- Tratar expiração de sessão, falta de autorização, indisponibilidade da API e validação de forma compreensível, sem erros não tratados no console.
- Usar HTTPS em produção; validar CORS, políticas de segurança e autorização.
- Não persistir indiscriminadamente dados financeiros sensíveis em cache de navegador.
- Invalidar dados que dependam de mutações financeiras e limpar estado de sessão no logout.
- Considerar PWA apenas após o núcleo funcional estar estável e existir uma política de cache segura.

## 8. Ordem de implementação

A evolução será incremental, preferencialmente em **fatias verticais testáveis**:

1. **Fundação Angular:** rotas, autenticação, sessão, HttpClient, erros, configurações e layout responsivo.
2. **Primeira jornada integrada:** cadastro → login → consulta do usuário/contexto financeiro interno → acesso à área autenticada.
3. **Fluxos financeiros principais:** dashboard, contas, categorias, lançamentos, movimentações/extratos, confirmações e transferências.
4. **Cartões de crédito:** cartões, compras, parcelamentos, faturas e pagamentos segundo o estado real da API.
5. **Consolidação:** acessibilidade, testes end-to-end, desempenho, revisão de segurança e eventual PWA.

Não é necessário criar todas as pastas ou implementar telas fictícias para cumprir a estrutura. Antes de cada módulo, conferir os contratos reais nos controllers, DTOs e testes do backend, e usar o Flutter anterior como **referência funcional, não como código a traduzir automaticamente**.

## 9. Qualidade e fluxo de trabalho no GitHub

Fluxo acordado:

1. Conferir o estado real de `main`, branches, PRs, endpoints e testes.
2. Criar ou utilizar **branch de funcionalidade**, mantendo `main` preservada.
3. Implementar uma entrega coesa e relativamente pequena.
4. Executar build e testes relevantes; registrar limitações quando não houver validação executável.
5. Disponibilizar a branch para atualização local pelo proprietário do projeto.
6. Corrigir feedback funcional/visual na mesma branch, quando apropriado.
7. Fazer **merge somente após aprovação explícita** do proprietário.

Critérios mínimos de aceite:

- `ng build` sem erros.
- Testes relevantes passando; funcionalidades críticas cobertas progressivamente.
- Tipagem e integração HTTP coerentes com a API real.
- Sem erros não tratados no console nas jornadas verificadas.
- Interface responsiva e usável por mouse e toque.
- Sem duplicação de regras financeiras no browser.
- Sem regressões de autenticação, autorização ou isolamento entre espaços.
- Código legível, com dependências justificadas e sem abstrações desnecessárias.

**Estado de referência em 14/10/2026:** branch Angular `chatgpt/fundacao-angular` criada para o trabalho inicial. PR #21 do backend e PR #3 do Flutter permaneciam abertos. Esse registro é histórico; reconfirmar no GitHub antes de agir.

## 10. Antipadrões a evitar

- Uma pasta global única `components/`, `services/` e `models/` contendo arquivos de todas as funcionalidades, obrigando navegar pelo projeto inteiro para compreender uma jornada.
- `shared/` como depósito genérico de código sem proprietário claro.
- Dependências cíclicas e features importando detalhes internos umas das outras.
- Camadas de arquitetura criadas sem propósito real.
- Estado global complexo antes de existir necessidade de compartilhamento ou sincronização.
- Regra financeira duplicada no frontend.
- Persistência de informações sensíveis sem avaliação de segurança.
- Layout desktop reduzido mecanicamente para celular.
- Migração automática dos arquivos Dart/Flutter para TypeScript.
- Alterações diretas na `main` ou merges sem validação local.

## 11. Como decidir diante de novas necessidades

Quando surgir dúvida de organização, responder nesta ordem:

1. **Qual funcionalidade é proprietária desse código?** Se houver uma, colocá-lo dentro dela.
2. **É infraestrutura global?** Se sim, avaliar `core/`.
3. **É exclusivamente estrutura visual compartilhada da aplicação?** Se sim, avaliar `layout/`.
4. **É genérico e comprovadamente reutilizado entre funcionalidades?** Se sim, avaliar `shared/`.
5. **A nova abstração reduz complexidade real ou apenas adiciona arquivos?** Preferir a alternativa mais simples que permaneça testável e compreensível.
6. **Há uma regra financeira ou decisão de autorização envolvida?** Confirmar que a responsabilidade permanece no backend.

A arquitetura é um **conjunto de princípios estáveis**, não uma árvore de diretórios imutável. Refatorações pontuais são aceitáveis quando houver benefício demonstrável, sem abandonar a organização por funcionalidades nem as regras financeiras existentes.

---

## 12. Registro de evolução arquitetural (14/10/2026)

- **Motivação:** a estrutura inicial misturava `.page.ts`, `.service.ts`, `.model.ts`, utilitários e SCSS no mesmo nível, principalmente em contas financeiras e dashboard. A organização orientada por funcionalidades já era aprovada, mas faltava padronização interna.
- **Decisão:** agrupar responsabilidades **dentro de cada feature**, sem criar pastas globais de domínio ou exigir Clean Architecture completa.
- **Dashboard:** cinco cards independentes correspondem aos identificadores persistidos `CONTAS_RECEBER`, `CONTAS_PAGAR`, `SALDOS_CONTAS`, `FLUXO_CAIXA` e `DESPESAS_CATEGORIA`. A página coordenadora mantém carregamento, período e preferências; os cards apresentam os dados recebidos sem duplicar cálculos financeiros.
- **Rotas:** preservar `/`, `/contas`, `/contas/nova`, `/contas/:contaId`, `/categorias`, `/lancamentos`, `/lancamentos/novo`, `/entrar`, `/cadastro` e `/configuracoes/painel`.
- **Branch de referência:** `chatgpt/refactor-organizacao-features` no repositório Angular, sobre `chatgpt/personalizacao-dashboard`; **nenhum merge na main sem aprovação**. O resultado final depende dos testes automáticos e da validação local.
- **Fontes do projeto:** este arquivo atualizado substitui conceitualmente o documento de 14/10/2026, preservando as decisões anteriores. Quando uma cópia do documento permanecer nas Fontes, substituí-la pela versão atualizada para não perpetuar uma orientação antiga.

---

## Referências

- Angular Style Guide oficial: https://angular.dev/style-guide
- Repositório Angular: https://github.com/FelipeJrMRQ/app-radar-financeiro
- Backend: https://github.com/FelipeJrMRQ/radar-financeiro-api
- Flutter legado/referência: https://github.com/FelipeJrMRQ/radar-financeiro-app
- Documento de direcionamento: `Radar_Financeiro_Direcionamento_Angular_2026-10-13.md`
- Manual de continuidade funcional/técnica: `Radar_Financeiro_Manual_Continuidade_2026-09-25.md`

**Síntese:** organizar por funcionalidades; manter infraestrutura transversal pequena e bem definida; adotar Angular moderno sem excesso de camadas; construir mobile first; manter regras financeiras e segurança no backend; criar somente o que a etapa exigir; validar cada branch antes de qualquer merge.
## 13. Organização dos menus da aplicação (14/10/2026)

A navegação da área autenticada será organizada em grupos com responsabilidades distintas:

- **Principal:** Início (dashboard) e Lançamentos (registro e consulta de receitas/despesas).
- **Cadastros:** contas financeiras, categorias e, futuramente, cartões e outros cadastros de apoio. É uma **central de acesso a cadastros**, não uma nova implementação dessas funcionalidades.
- **Configurações:** personalização do painel, perfil do usuário e futuros ajustes pessoais (segurança, notificações, exibição e preferências gerais).

**Mobile first:** a navegação inferior mantém quatro destinos (Início, Lançamentos,
Cadastros e Configurações). As duas centrais organizam seus links em cartões acessíveis
e responsivos. No desktop, o menu lateral apresenta grupos expansíveis e seus links.

**Regras de evolução:** manter as rotas financeiras existentes, sem migrar telas
de features apenas por mudarem de grupo no menu. `cadastros/` e `configuracoes/`
são responsáveis pelas suas próprias páginas/rotas; `layout/` continua responsável
unicamente pela navegação. Não criar links clicáveis para funcionalidades não
implementadas. O perfil inicial usa somente dados da sessão autenticada e é
**somente leitura** até existir suporte seguro no backend para edição.

O `EspacoFinanceiro` permanece interno e invisível ao usuário: a palavra
"conta" em Cadastros indica uma **conta financeira**; em Configurações,
"Minha conta" refere-se ao **perfil da pessoa autenticada**, nunca ao espaço
financeiro técnico. Nenhum ajuste administrativo deve contornar isolamento
por usuário ou validações da API.

**Branch de implementação:** `chatgpt/menus-cadastros-configuracoes`, baseada
na refatoração `chatgpt/refactor-organizacao-features`. Preservar o fluxo de PR
em rascunho e não fazer merge na `main` sem aprovação explícita.
