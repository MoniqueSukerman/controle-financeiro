# Controle Financeiro

Protótipo de app de controle financeiro pessoal — extrato bancário com divisão de transação em múltiplas categorias, orçamento mensal e metas de longo prazo inspirados numa planilha pessoal, e gestão de categorias/grupos.

Vite + React + TypeScript, sem backend. Todo o estado vive no navegador.

## Rodando localmente

```bash
npm install
npm run dev      # dev server, http://localhost:5183 (ou porta livre)
npm run build    # build de produção (tsc + vite build) em dist/
npm run lint     # oxlint
npm run preview  # serve o build de produção localmente
```

## Funcionalidades

- **Extrato** — lista de transações estilo extrato bancário. Cada transação pode ser expandida e dividida em múltiplas categorias (ex: uma fatura de cartão única dividida em Mercado + Farmácia + Outros), com validação de que a soma das partes bate com o valor total.
- **Orçamento** — fluxo mensal (Recebido, Dízimo, Metas, Orçamento mensal, gastos do dia a dia, Ajustes, Saldo), um mês por vez via seletor.
- **Metas** — destinação por objetivo de longo prazo (Imóvel, Viagens, Médico, Família etc.) com colunas Objetivo/Falta.
- **Categorias** — gestão de grupos e categorias usados no Extrato: criar, renomear, excluir e reordenar (botões ↑/↓) tanto grupos quanto categorias dentro deles.
- **Importações** — importa extratos bancários (.ofx/.qfx) para uma conta escolhida; as transações entram como "Não categorizado". O import é idempotente por **dia e conta**: cada lote registra os dias em que trouxe lançamentos, e uma nova importação para a mesma conta só cria transações de dias ainda não cobertos. Importar o mesmo arquivo duas vezes, ou arquivos com períodos sobrepostos, não duplica lançamentos. Excluir um lote libera seus dias para reimportação.

Orçamento e Metas usam dados estáticos (histórico da planilha pessoal); Extrato e Categorias usam dados reais editáveis pelo usuário.

## Persistência

Todo o estado (transações, categorias, grupos) é salvo em `localStorage` a cada mudança — sobrevive a refresh (F5) e fechar o navegador. Não sobrevive a limpar dados do navegador nem funciona entre navegadores/aparelhos diferentes sem um dos backups abaixo.

## Backup

Dois mecanismos independentes, podem estar os dois ativos ao mesmo tempo:

### 1. Pasta local (Chrome/Edge apenas)

Usa a File System Access API do navegador. Você aponta uma vez para uma pasta local sincronizada pelo Google Drive Desktop (ou qualquer outro serviço de sync de pasta), e o app escreve `controle-financeiro-backup.json` ali a cada mudança.

- Ativar: botão "Conectar pasta de backup" no menu lateral (ícone ☰).
- Só escreve — não existe restauração a partir da pasta local. Não funciona em navegador de celular (a API não existe lá).
- Útil como cópia de segurança passiva do que está no notebook, não para acessar de outro aparelho.

### 2. Google Drive API (OAuth) — sincronização entre aparelhos

Fala direto com o Google Drive pela nuvem (não depende de pasta sincronizada), funciona em qualquer navegador/aparelho, incluindo celular. Este é o mecanismo que permite usar o app em mais de um dispositivo.

Escopo usado: `drive.file` — o app só enxerga arquivos que ele mesmo criou, nunca o resto do Drive do usuário.

Ao conectar, se já existir um backup no Drive, o app pergunta **"carregar esse backup ou manter os dados daqui"** — nunca sobrescreve sozinho. Não há merge de verdade: se os dois aparelhos forem editados offline ao mesmo tempo, um dos dois lados perde a edição ao sincronizar.

O token de acesso expira em ~1h (limitação inerente a app 100% client-side, sem backend para guardar refresh token com segurança) — de vez em quando é preciso clicar em "Conectar" de novo.

#### Configuração necessária (feita uma vez, manualmente, no Google Cloud Console)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) e crie um projeto (ou use um existente).
2. **APIs e Serviços → Biblioteca** → busque "Google Drive API" → Ativar.
3. **APIs e Serviços → Tela de consentimento OAuth**: tipo "Externo", preencha nome do app e seu e-mail como suporte/desenvolvedor. Em "Usuários de teste", adicione o e-mail que você vai usar para conectar o Drive.
4. **APIs e Serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, tipo "Aplicativo da Web". Em "Origens JavaScript autorizadas", adicione `http://localhost:5183` (ajuste a porta se for diferente) e, depois de fazer deploy, a URL de produção também.
5. Copie o **Client ID** gerado (formato `algo.apps.googleusercontent.com`).
6. `cp .env.example .env.local` e preencha:
   ```
   VITE_GOOGLE_CLIENT_ID=<seu-client-id-aqui>
   ```
7. Reinicie o dev server (`npm run dev`) para o Vite carregar a variável.

Ao clicar em "Conectar Google Drive" no app, o Google mostra um aviso de "app não verificado" — normal para uso pessoal em modo de teste. Clique em "Avançado" → "Acessar (não seguro)".

**Importante ao fazer deploy**: volte no passo 4 e adicione a URL de produção nas origens autorizadas, senão o OAuth falha silenciosamente lá.

## Design

Padrões de UI (botões, seletores, tabelas, responsividade) documentados em [DESIGN.md](DESIGN.md).

## Status atual / limitações conhecidas

- A deduplicação do import OFX é por dia inteiro: se um dia já importado receber lançamentos novos depois (arquivo exportado no meio do dia), uma reimportação não os traz — é preciso excluir o lote e importar de novo. Não há dedupe por FITID.
- Orçamento e Metas são somente leitura, com dados estáticos copiados da planilha original — não são calculados a partir das transações reais do Extrato nem são editáveis pela UI.
- Zero testes automatizados.
- Responsividade mobile ajustada via CSS (menu lateral off-canvas, tabelas com scroll horizontal, formulários empilhados), mas não testada num aparelho real.
- Validação de formulário mínima (ex: não impede nome de categoria vazio ou duplicado).
- Backup em pasta local é write-only (sem restauração); Google Drive tem restauração mas exige configuração manual (acima) e não tem merge real de conflitos.
- Ainda não foi feito deploy (Vercel/Netlify/Cloudflare Pages servem o build estático de `dist/` diretamente).
