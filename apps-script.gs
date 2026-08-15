/**
 * Backend da confirmação de presença do aniversário do Enrico.
 *
 * Este arquivo NÃO roda no GitHub Pages. Ele deve ser colado no editor do
 * Google Apps Script, vinculado a uma planilha do Google Sheets.
 * O passo a passo completo está no README.md.
 *
 * Todas as operações chegam por POST, com o corpo em JSON:
 *
 *   {action:'save',   responsavel, guests[], force}  -> grava a confirmação
 *   {action:'list',   pin}                           -> devolve a lista
 *   {action:'delete', pin, grupo}                    -> apaga uma família
 *   {action:'delete', pin, id}                       -> apaga um convidado
 *
 * O PIN do organizador fica AQUI, no servidor, e nunca é enviado para a
 * página. Assim a lista e a exclusão ficam de fato protegidas — se o PIN
 * estivesse no index.html, qualquer convidado veria no código-fonte.
 */

const SHEET_NAME = 'Confirmações';
const HEADERS = ['Data/Hora', 'Grupo', 'Responsável', 'Convidado', 'Tipo', 'Idade', 'ID'];

/**
 * Deixe vazio se o script foi criado pela planilha (Extensões -> Apps Script).
 *
 * Se você criou o script avulso, em script.google.com, cole aqui o ID da
 * planilha. Ele fica no meio da URL dela:
 *   docs.google.com/spreadsheets/d/ ESTE_PEDAÇO_AQUI /edit
 * Script avulso não tem "planilha ativa", então sem o ID ele não acha onde
 * escrever.
 */
const SPREADSHEET_ID = '';

const PIN_PADRAO = '2611';

/**
 * Para trocar o PIN sem mexer no código (recomendado, já que este arquivo
 * está num repositório público): no editor do Apps Script vá em
 * Configurações do projeto -> Propriedades do script -> Adicionar,
 * com nome ORGANIZER_PIN e o valor que quiser.
 */
function getPin_() {
  const prop = PropertiesService.getScriptProperties().getProperty('ORGANIZER_PIN');
  return (prop && String(prop).trim()) || PIN_PADRAO;
}

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'corpo vazio' });
    }
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'save';

    if (action === 'save')   return salvar_(data);
    if (action === 'list')   return listar_(data);
    if (action === 'delete') return excluir_(data);

    return json_({ ok: false, error: 'ação desconhecida: ' + action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// só para conferir no navegador se a implantação está no ar
function doGet() {
  return json_({ ok: true, status: 'online' });
}

/* ------------------------------------------------------------------ */
/* save                                                                */
/* ------------------------------------------------------------------ */
function salvar_(data) {
  const guests = Array.isArray(data.guests) ? data.guests : [];
  if (guests.length === 0) {
    return json_({ ok: false, error: 'nenhum convidado enviado' });
  }

  const responsavel = texto_(data.responsavel) || 'Convidado';
  const sheet = getSheet_();
  const existentes = lerLinhas_(sheet);

  // procura nomes que já constam na lista, ignorando acentos e maiúsculas
  if (data.force !== true) {
    const jaTem = {};
    existentes.forEach(function (l) {
      jaTem[chaveNome_(l.convidado)] = { nome: l.convidado, responsavel: l.responsavel };
    });

    const repetidos = [];
    guests.forEach(function (g) {
      const achou = jaTem[chaveNome_(g && g.name)];
      if (achou) repetidos.push(achou);
    });

    if (repetidos.length > 0) {
      return json_({ ok: false, duplicate: true, matches: repetidos });
    }
  }

  const quando = new Date();
  const grupo = Utilities.getUuid().slice(0, 8);

  const linhas = guests.slice(0, 40).map(function (g) {
    const crianca = g && g.isChild === true;
    return [
      quando,
      grupo,
      responsavel,
      texto_(g && g.name) || '(sem nome)',
      crianca ? 'Criança' : 'Adulto',
      crianca && g.age != null && g.age !== '' ? Number(g.age) : '',
      Utilities.getUuid()
    ];
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, linhas.length, HEADERS.length)
       .setValues(linhas);

  return json_({ ok: true, grupo: grupo, count: linhas.length });
}

/* ------------------------------------------------------------------ */
/* list                                                                */
/* ------------------------------------------------------------------ */
function listar_(data) {
  if (!pinConfere_(data)) return json_({ ok: false, pinInvalido: true, error: 'pin' });

  const sheet = getSheet_();
  const linhas = lerLinhas_(sheet);

  const porGrupo = {};
  const ordem = [];

  linhas.forEach(function (l) {
    if (!porGrupo[l.grupo]) {
      porGrupo[l.grupo] = {
        grupo: l.grupo,
        responsavel: l.responsavel,
        submittedAt: l.quando,
        guests: []
      };
      ordem.push(l.grupo);
    }
    porGrupo[l.grupo].guests.push({
      id: l.id,
      name: l.convidado,
      isChild: l.crianca,
      age: l.idade
    });
  });

  const families = ordem.map(function (k) { return porGrupo[k]; });
  families.sort(function (a, b) {
    return String(a.submittedAt).localeCompare(String(b.submittedAt));
  });

  return json_({ ok: true, families: families });
}

/* ------------------------------------------------------------------ */
/* delete                                                              */
/* ------------------------------------------------------------------ */
function excluir_(data) {
  if (!pinConfere_(data)) return json_({ ok: false, pinInvalido: true, error: 'pin' });

  const grupo = texto_(data.grupo);
  const id = texto_(data.id);
  if (!grupo && !id) return json_({ ok: false, error: 'informe grupo ou id' });

  const sheet = getSheet_();
  const linhas = lerLinhas_(sheet);

  const alvos = linhas.filter(function (l) {
    return id ? l.id === id : l.grupo === grupo;
  });

  if (alvos.length === 0) return json_({ ok: true, removed: 0 });

  // de baixo para cima: apagar a linha 5 primeiro faria a 9 virar 8
  alvos.map(function (l) { return l.linha; })
       .sort(function (a, b) { return b - a; })
       .forEach(function (n) { sheet.deleteRow(n); });

  return json_({ ok: true, removed: alvos.length });
}

/* ------------------------------------------------------------------ */
/* Auxiliares                                                          */
/* ------------------------------------------------------------------ */
function pinConfere_(data) {
  return texto_(data && data.pin) === String(getPin_()).trim();
}

/**
 * Lê a planilha inteira já normalizada. Linhas antigas (ou digitadas na mão)
 * podem não ter ID nem Grupo; geramos e gravamos de volta, senão a exclusão
 * não teria como identificar a linha.
 */
function lerLinhas_(sheet) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return [];

  const intervalo = sheet.getRange(2, 1, ultimaLinha - 1, HEADERS.length);
  const valores = intervalo.getValues();
  const resultado = [];
  let precisaGravar = false;

  valores.forEach(function (linha, i) {
    const nome = texto_(linha[3]);
    if (!nome) return;   // ignora linhas em branco ou apagadas na mão

    if (!texto_(linha[1])) { linha[1] = 'manual-' + Utilities.getUuid().slice(0, 8); precisaGravar = true; }
    if (!texto_(linha[6])) { linha[6] = Utilities.getUuid(); precisaGravar = true; }

    const tipo = texto_(linha[4]).toLowerCase();
    const crianca = tipo.indexOf('crian') === 0;

    resultado.push({
      linha: i + 2,                       // número da linha na planilha
      quando: paraIso_(linha[0]),
      grupo: String(linha[1]),
      responsavel: texto_(linha[2]) || 'Convidado',
      convidado: nome,
      crianca: crianca,
      idade: crianca && linha[5] !== '' && linha[5] != null ? Number(linha[5]) : null,
      id: String(linha[6])
    });
  });

  if (precisaGravar) intervalo.setValues(valores);
  return resultado;
}

/** Funciona tanto no script vinculado à planilha quanto no script avulso. */
function getPlanilha_() {
  const id = String(SPREADSHEET_ID || '').trim();
  if (id) return SpreadsheetApp.openById(id);

  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (!ativa) {
    throw new Error(
      'Não achei a planilha. Se o script foi criado avulso (em script.google.com), ' +
      'preencha SPREADSHEET_ID no início deste arquivo com o ID da planilha.'
    );
  }
  return ativa;
}

function getSheet_() {
  const ss = getPlanilha_();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 220);
  } else {
    // planilha criada por uma versão anterior, que não tinha a coluna ID
    const cabecalho = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (texto_(cabecalho[6]) !== 'ID') {
      sheet.getRange(1, 7).setValue('ID').setFontWeight('bold');
    }
  }
  return sheet;
}

/** Compara nomes ignorando acento, maiúscula e espaço sobrando. */
function chaveNome_(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function texto_(v) {
  return v == null ? '' : String(v).trim().slice(0, 120);
}

function paraIso_(v) {
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
