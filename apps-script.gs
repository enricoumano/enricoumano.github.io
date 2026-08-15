/**
 * Backend da confirmação de presença do aniversário do Enrico.
 *
 * Este arquivo NÃO roda no GitHub Pages. Ele deve ser colado no editor do
 * Google Apps Script, vinculado a uma planilha do Google Sheets.
 * O passo a passo completo está no README.md.
 *
 * O que ele faz:
 *   POST /exec              -> grava uma linha por convidado na planilha
 *   GET  /exec?action=list  -> devolve as confirmações agrupadas por família
 */

const SHEET_NAME = 'Confirmações';
const HEADERS = ['Data/Hora', 'Grupo', 'Responsável', 'Convidado', 'Tipo', 'Idade'];

/* ------------------------------------------------------------------ */
/* Gravação                                                            */
/* ------------------------------------------------------------------ */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // evita que duas confirmações simultâneas escrevam na mesma linha
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'corpo vazio' });
    }

    const data = JSON.parse(e.postData.contents);
    const guests = Array.isArray(data.guests) ? data.guests : [];
    if (guests.length === 0) {
      return json_({ ok: false, error: 'nenhum convidado enviado' });
    }

    const responsavel = texto_(data.responsavel) || 'Convidado';
    const sheet = getSheet_();
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
        crianca && g.age != null && g.age !== '' ? Number(g.age) : ''
      ];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, linhas.length, HEADERS.length)
         .setValues(linhas);

    return json_({ ok: true, grupo: grupo, count: linhas.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Leitura (painel do organizador)                                     */
/* ------------------------------------------------------------------ */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'list';
    if (action !== 'list') {
      return json_({ ok: false, error: 'ação desconhecida: ' + action });
    }

    const sheet = getSheet_();
    const ultimaLinha = sheet.getLastRow();
    if (ultimaLinha < 2) {
      return json_({ ok: true, families: [] });
    }

    const valores = sheet.getRange(2, 1, ultimaLinha - 1, HEADERS.length).getValues();
    const porGrupo = {};
    const ordem = [];

    valores.forEach(function (linha, i) {
      const quando = linha[0];
      const grupo = texto_(linha[1]);
      const responsavel = texto_(linha[2]) || 'Convidado';
      const nome = texto_(linha[3]);
      const tipo = texto_(linha[4]);
      const idade = linha[5];

      // ignora linhas em branco ou apagadas na mão
      if (!nome) return;

      // linhas adicionadas manualmente na planilha podem não ter Grupo
      const chave = grupo || ('manual-' + responsavel + '-' + i);

      if (!porGrupo[chave]) {
        porGrupo[chave] = {
          responsavel: responsavel,
          submittedAt: paraIso_(quando),
          guests: []
        };
        ordem.push(chave);
      }

      const crianca = tipo.toLowerCase().indexOf('crian') === 0;
      porGrupo[chave].guests.push({
        name: nome,
        isChild: crianca,
        age: crianca && idade !== '' && idade != null ? Number(idade) : null
      });
    });

    const families = ordem.map(function (k) { return porGrupo[k]; });
    families.sort(function (a, b) {
      return String(a.submittedAt).localeCompare(String(b.submittedAt));
    });

    return json_({ ok: true, families: families });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ */
/* Auxiliares                                                          */
/* ------------------------------------------------------------------ */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(3, 200);
    sheet.setColumnWidth(4, 220);
  }
  return sheet;
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
