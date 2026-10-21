# Radar Financeiro — Aplicação da identidade visual

**Data:** 14/10/2026  
**Origem:** `identidade_visual.zip`, disponível nas Fontes do projeto Radar Financeiro.  
**Objetivo:** incorporar a marca às telas existentes sem acoplar apresentação e lógica financeira.

## Ativos versionados

| Arquivo | Origem dentro do ZIP | Uso |
| --- | --- | --- |
| `public/assets/brand/logo-radar-financeiro.webp` | Imagem ...09_17_16-1.png | Marca principal no login e cadastro (área clara) |
| `public/assets/brand/simbolo-radar.webp` | Imagem ...09_17_23-6.png | Marca compacta na navegação mobile, sidebar e login desktop |
| `public/assets/brand/icone-carteira.webp` | Imagem ...09_17_21-5.png | Ícone de contas financeiras |
| `public/assets/brand/icone-analise.webp` | Imagem ...09_17_18-3.png | Ícone da funcionalidade de contas no dashboard |
| `public/favicon.ico` | Gerado a partir da imagem ...09_17_23-6.png | Ícone do navegador |
| `public/assets/brand/fundo-autenticacao.webp` | Imagem ...09_17_28-8.png | Fundo desktop das telas de login/cadastro |
| `public/assets/brand/fundo-dashboard.webp` | Imagem ...09_17_27-7.png | Imagem decorativa do destaque inicial |

Os nomes completos dos arquivos da origem estão no ZIP; a numeração é o sufixo final `-1` até `-8`. Os PNGs originais continuam no material de referência, não no bundle Angular.

## Implementação

- **Mobile first:** login e cadastro usam fundo branco e logo principal compacta; não há transferência desnecessária do fundo desktop para telas pequenas onde não aparece. O dashboard usa imagem WebP decorativa de tamanho reduzido.
- **Desktop:** painel de autenticação com imagem escura, overlay para contraste; logo principal na área clara.
- **Navegação:** símbolo radar com texto HTML acessível, mantendo estrutura responsiva.
- **Cores:** navy, teal e dourado, com tokens `--rf-*` em `src/styles.scss`. Dourado é reservado para detalhes e reforço visual.
- **Acessibilidade:** texto da marca permanece legível em HTML; imagens decorativas com `alt=""`, logo significativa com texto alternativo; controles têm foco visível.
- **Performance:** WebP e favicon compactos, imagens servidas localmente; não adicionar bibliotecas de ícones nesta fase.

## Próximos ajustes

Se a identidade em paralelo mudar, atualizar os arquivos de `public/assets/brand` e os tokens antes de redesenhar telas individualmente.

A identidade é **camada visual**; não alterar autenticação, tipagem dos contratos, isolamento financeiro, cálculos ou comportamento das funcionalidades por motivos de marca.

## Validação manual

Conferir login, cadastro, header mobile, sidebar desktop, dashboard e favicon; validar em 360 px, 768 px e desktop, incluindo contraste, layout sem rolagem horizontal e carregamento das imagens sem erros 404.
