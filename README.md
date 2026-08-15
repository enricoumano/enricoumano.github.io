# Aniversário do Enrico — confirmação de presença

Página de convite e RSVP para o aniversário de 1 ano do Enrico (21/11/2026, 11h).
Hospedada no GitHub Pages, com as confirmações caindo direto numa planilha do
Google Sheets.

**Site:** https://enricoumano.github.io/enricoumano/

## Como funciona

```
Convidado abre o site  ──POST──►  Google Apps Script  ──►  Planilha do Google
                                          │
Organizador digita o PIN ──GET──►─────────┘
   e vê a lista formatada na própria página
```

| Arquivo | O que é |
| --- | --- |
| `index.html` | O site inteiro (convite, formulário e painel do organizador) |
| `convite.jpg` | A arte do convite |
| `apps-script.gs` | Código que roda no Google Apps Script — **não** faz parte do site |

## Configuração (só precisa fazer uma vez)

### 1. Criar a planilha

1. Abra <https://sheets.new> e crie uma planilha nova.
2. Dê um nome a ela, por exemplo **Confirmações — Aniversário Enrico**.

### 2. Colar o código do Apps Script

1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague todo o conteúdo do arquivo `Código.gs` que aparecer.
3. Copie **todo** o conteúdo de [`apps-script.gs`](apps-script.gs) deste
   repositório e cole no lugar.
4. Clique no ícone de salvar (💾).

### 3. Publicar como app da web

1. No canto superior direito, clique em **Implantar → Nova implantação**.
2. Em **Selecionar tipo** (ícone de engrenagem), escolha **App da Web**.
3. Preencha:
   - **Descrição:** `RSVP Enrico`
   - **Executar como:** `Eu (seu-email@gmail.com)`
   - **Quem pode acessar:** **`Qualquer pessoa`**
     *(atenção: é "Qualquer pessoa", não "Qualquer pessoa com Conta do Google" —
     senão os convidados vão precisar fazer login)*
4. Clique em **Implantar** e autorize o acesso quando o Google pedir.
   Na tela de aviso, use **Avançado → Acessar (não seguro)** — o "app não
   verificado" é o seu próprio script.
5. Copie a **URL do app da web**. Ela termina em `/exec` e se parece com:
   `https://script.google.com/macros/s/AKfycb.../exec`

### 4. Conectar o site à planilha

No arquivo `index.html`, procure o bloco de configuração (logo no início do
`<script>`) e troque o texto entre aspas pela URL que você copiou:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "COLE_AQUI_A_URL_DO_APPS_SCRIPT",   // ← cole aqui
  ORGANIZER_PIN: "2611"
};
```

Salve e faça commit. O GitHub Pages republica sozinho em ~1 minuto.

## Área do organizador

No rodapé do convite existe um link discreto **"Área do organizador"**.
O código é o `ORGANIZER_PIN` definido em `index.html` (hoje: `2611`).

A tela mostra:

- total de famílias, convidados e crianças;
- cada família com quem vai, se é adulto ou criança (com a idade) e quando confirmou;
- busca por nome e botão de atualizar.

> **Sobre o PIN:** ele só serve para esconder o painel de curiosos casuais.
> Como o site é público e estático, o código aparece no código-fonte da página.
> Quem souber procurar consegue ver a lista. Para uma lista de convidados de
> festa infantil isso costuma ser aceitável — mas não coloque nada sensível ali.

## Alterações comuns

**Trocar o PIN:** edite `ORGANIZER_PIN` em `index.html`.

**Trocar a arte do convite:** substitua o arquivo `convite.jpg`. Se as dimensões
mudarem, atualize também `width`/`height` na tag `<img>` e as metatags
`og:image:width` / `og:image:height`, que controlam o preview do link no WhatsApp.

**Apagar ou corrigir uma confirmação:** edite direto na planilha. Apagar a linha
some com a pessoa da lista; apagar todas as linhas de um mesmo `Grupo` some com a
família inteira.

**Depois de mexer no `apps-script.gs`:** é preciso reimplantar —
**Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**.
Se você criar uma implantação nova em vez de editar a existente, a URL muda e
precisa ser atualizada no `index.html`.
