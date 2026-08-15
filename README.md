# Aniversário do Enrico — confirmação de presença

Página de convite e RSVP para o aniversário de 1 ano do Enrico (21/11/2026, 11h).
Hospedada no GitHub Pages, com as confirmações caindo direto numa planilha do
Google Sheets.

**Site:** https://enricoumano.github.io/

## Como funciona

```
Convidado abre o site  ──POST {action:'save'}──►  Google Apps Script  ──►  Planilha
                                                        │
Organizador digita o PIN ──POST {action:'list'}──►──────┤   (o PIN é conferido aqui,
                                                        │    no servidor)
                         ──POST {action:'delete'}──►────┘
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

> **Se aparecer "Sorry, unable to open the file at this time"** ao clicar em
> Extensões → Apps Script, quase sempre é **mais de uma conta Google logada no
> mesmo navegador**: o editor abre na conta padrão, e a planilha é de outra.
>
> - Teste numa janela anônima, logado só na conta dona da planilha.
> - Se o erro persistir e a conta for corporativa (Workspace), pode ser o
>   administrador do domínio ter desativado o Apps Script. Nesse caso use uma
>   conta pessoal `@gmail.com`.
> - Alternativa que não depende desse menu: crie o script **avulso** em
>   <https://script.google.com/home/projects/create> e preencha a constante
>   `SPREADSHEET_ID` no início do `apps-script.gs` com o ID da planilha (o
>   pedaço da URL entre `/d/` e `/edit`). O restante do passo a passo é igual.

### 3. Definir o PIN do organizador

O PIN mora no servidor, não na página. Se você não fizer nada, ele é `2611`.
Para trocar (recomendado, já que este repositório é público):

1. No editor do Apps Script, clique em **⚙ Configurações do projeto**.
2. Em **Propriedades do script**, clique em **Adicionar propriedade**.
3. Nome: `ORGANIZER_PIN` · Valor: o código que você quiser.
4. **Salvar propriedades do script**.

### 4. Publicar como app da web

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

Para conferir se está no ar, abra essa URL no navegador: deve aparecer
`{"ok":true,"status":"online"}`.

### 5. Conectar o site à planilha

No arquivo `index.html`, procure o bloco de configuração (logo no início do
`<script>`) e troque o texto entre aspas pela URL que você copiou:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "COLE_AQUI_A_URL_DO_APPS_SCRIPT"   // ← cole aqui
};
```

Salve e faça commit. O GitHub Pages republica sozinho em ~1 minuto.

## Confirmação repetida

Ao enviar, o servidor compara cada nome com os que já estão na planilha,
**ignorando acentos, maiúsculas e espaço sobrando** — `"ana silva"` bate com
`"Ana Silva"`. Se encontrar, nada é gravado e o convidado vê quais nomes já
constam e quem os confirmou.

Como duas pessoas podem realmente ter o mesmo nome, existe um botão
**"Confirmar mesmo assim"**, que reenvia ignorando a checagem.

## Área do organizador

No rodapé do convite existe um link discreto **"Área do organizador"**.

A tela mostra:

- total de famílias, convidados e crianças;
- cada família com quem vai, se é adulto ou criança (com a idade) e quando confirmou;
- busca por nome e botão de atualizar;
- **×** ao lado de cada convidado, para remover uma pessoa;
- **Excluir confirmação**, para remover a família inteira.

A exclusão é definitiva — apaga as linhas da planilha e não dá para desfazer
pelo site. (O Sheets ainda tem **Arquivo → Histórico de versões** se você
precisar recuperar algo.)

O PIN fica guardado enquanto a aba estiver aberta; **Sair do painel** esquece.

> **Sobre a segurança:** o PIN é validado dentro do Apps Script e nunca é
> enviado para a página, então não aparece no código-fonte — ver a lista e
> excluir exigem o código de verdade. O que continua aberto é o **envio** de
> confirmações: a URL do Apps Script está no HTML, então em tese alguém poderia
> mandar confirmações falsas. Se aparecer lixo, é só excluir pelo painel.

## Estrutura da planilha

| Coluna | Conteúdo |
| --- | --- |
| Data/Hora | quando a confirmação foi enviada |
| Grupo | identifica a família — todas as pessoas de um mesmo envio compartilham |
| Responsável | o **primeiro** nome da confirmação, usado como rótulo do grupo |
| Convidado | nome da pessoa (uma linha por pessoa) |
| Tipo | `Adulto` ou `Criança` |
| Idade | preenchido só para crianças |
| ID | identificador único da linha, usado pela exclusão |

Dá para editar na mão. Se você adicionar uma linha sem `Grupo` ou sem `ID`, o
script preenche sozinho na próxima vez que a lista for carregada.

## Alterações comuns

**Trocar o PIN:** altere a propriedade `ORGANIZER_PIN` no Apps Script
(passo 3). Não precisa mexer no site nem reimplantar.

**Trocar a arte do convite:** substitua o arquivo `convite.jpg`. Se as dimensões
mudarem, atualize também `width`/`height` na tag `<img>` e as metatags
`og:image:width` / `og:image:height`, que controlam o preview do link no WhatsApp.

**Depois de mexer no `apps-script.gs`:** é preciso reimplantar —
**Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**.
Se você criar uma implantação nova em vez de editar a existente, a URL muda e
precisa ser atualizada no `index.html`.
