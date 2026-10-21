# Radar Financeiro — instalação PWA no Android

## Diagnóstico confirmado no teste de 20/10/2026

O celular abriu `http://125.67.2.9:4200` com barra de endereço, aviso de conexão não segura e ícone da tela inicial com sobreposição do Chrome. Esse comportamento corresponde a um **atalho para um site**, não à experiência instalada em janela `standalone`.

A causa principal é a origem **HTTP por IP**, que não atende aos requisitos de instalação PWA. Além disso, a porta 4200 estava servindo o **Angular em desenvolvimento** (`ng serve`), e o código do projeto não registra seu service worker em modo de desenvolvimento. Os testes locais de manifesto e PNGs não cobrem esses requisitos de execução.

> Segurança: o login e o JWT do Radar Financeiro não devem transitar por HTTP em rede. Não expor a porta 4200 ou o serviço de desenvolvimento diretamente à Internet, principalmente com dados financeiros reais.

## Ambiente correto para teste

1. Rodar `npm ci` e `npm run build` no frontend.
2. Hospedar `dist/app-radar-financeiro/browser` em um servidor Web **HTTPS válido**, com domínio estável e certificado confiável para o Chrome Android. O servidor precisa retornar `index.html` para rotas client-side não correspondentes a arquivos.
3. Encaminhar `/api/*` pelo mesmo domínio HTTPS para o backend Spring Boot na rede interna, removendo o prefixo `/api` conforme o `proxy.conf.json`; restringir o acesso ao backend e configurar autenticação adequadamente.
4. Testar pelo celular a URL **`https://<seu-dominio>/`**, sem aviso de segurança. Verificar se `/manifest.webmanifest`, `/sw.js` e `/icons/icon-192.png` são carregados com 200, e se o tipo MIME do manifesto é `application/manifest+json` ou um tipo JSON aceito pelo Chrome.
5. Remover da tela inicial o **atalho antigo** (com emblema do Chrome). No Chrome, abrir a URL HTTPS, aguardar a página carregar e usar **Instalar app** / **Instalar** (a nomenclatura pode variar). Não escolher apenas **Criar atalho**.
6. Abrir o ícone instalado e confirmar: nome curto **Radar**, sem barra de endereço, com barra de status do sistema preservada.

## O que o projeto já fornece

- `public/manifest.webmanifest` com `name`, `short_name`, `id`, `start_url`, `scope`, modo `standalone` e ícones PNG 192/512.
- `src/index.html` com `<link rel="manifest">`, ícone para iOS, viewport com safe areas e cores de tema.
- `public/sw.js` faz cache apenas do shell e dos recursos estáticos e **não armazena respostas financeiras da API**.
- `src/main.ts` registra o service worker **apenas em produção**, depois do carregamento da página.
- `npm run build && npm run test:pwa` valida os artefatos produzidos, mas não substitui o teste real do Android.

## Identificar o motivo caso ainda abra no Chrome

| Sintoma | Verificação |
| --- | --- |
| Barra de URL e emblema do Chrome | Verificar se o ícone é um atalho antigo e reinstalar a partir da URL HTTPS |
| URL começa por `http://` ou há aviso de certificado | Corrigir hospedagem e certificado; não há solução apenas alterando o manifesto |
| Instalação indisponível apesar de HTTPS | Verificar manifesto, ícones, escopo e console do Chrome; conferir se o servidor retorna HTML/JSON corretos |
| Service worker ausente | Confirmar **build de produção** (não `ng serve` de desenvolvimento), origem HTTPS e disponibilidade de `/sw.js` |
| Abre aplicativo mas redireciona para outra origem | Manter login, app e rotas dentro do mesmo `scope` e origem definida no manifesto |
| Login não funciona no servidor estático | Configurar reverse proxy HTTPS para `/api` até o Spring Boot |

O modo `standalone` oculta a barra de URL. O modo `fullscreen` também a ocultaria, porém normalmente remove outras áreas do sistema: preferimos `standalone` por comportamento mais natural em um app financeiro.

**Não instalar certificados autoassinados não confiáveis nem desabilitar proteções de segurança do navegador apenas para forçar a instalação.** Para testes sem domínio público, usar uma solução de HTTPS privado confiável e restringir o acesso.

## Critério de aceite

No Chrome do celular: aplicativo instalado sem emblema de atalho, acesso pelo ícone em janela separada e sem barra de endereço. No desktop, confirmar respostas HTTP 200 a `/manifest.webmanifest`, `/sw.js`, ícones e `/api` via HTTPS. As funcionalidades financeiras continuam dependendo da API online.
