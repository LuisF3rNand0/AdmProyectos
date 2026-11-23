// Extrae fecha y número de operación desde el texto real devuelto por OCR.space.
// Si un dato no aparece con suficiente claridad, devuelve null: no se inventa.
function extraerFechaVoucher(textoOCR) {
  const texto = textoOCR.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const lineas = texto.split(/\r?\n/).map(linea => linea.trim()).filter(Boolean);
  const meses = { ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12 };

  function normalizarFecha(dia, mes, anio) {
    const d = Number(dia), m = Number(mes);
    let y = Number(anio);
    if (y < 100) y += 2000;
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
    const fecha = new Date(Date.UTC(y, m - 1, d));
    if (fecha.getUTCDate() !== d || fecha.getUTCMonth() + 1 !== m) return null;
    return String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y;
  }

  function buscarFecha(fragmento) {
    const fechaISO = /\b(20\d{2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\b/g;
    const fechaDMY = /\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4}|\d{2})\b/g;
    const fechaLetras = /\b(\d{1,2})\s+(?:DE\s+)?(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)\s*[,.]?\s*(?:DE\s+)?(\d{4}|\d{2})\b/g;
    for (const m of fragmento.matchAll(fechaISO)) {
      const fecha = normalizarFecha(m[3], m[2], m[1]);
      if (fecha) return fecha;
    }
    for (const m of fragmento.matchAll(fechaDMY)) {
      const fecha = normalizarFecha(m[1], m[2], m[3]);
      if (fecha) return fecha;
    }
    for (const m of fragmento.matchAll(fechaLetras)) {
      const fecha = normalizarFecha(m[1], meses[m[2].slice(0, 3)], m[3]);
      if (fecha) return fecha;
    }
    return null;
  }

  const candidatas = [];
  for (let i = 0; i < lineas.length; i++) {
    if (/\b(?:FECHA|FEC|REALIZADO|EFECTUADO|DIA)\b/.test(lineas[i])) {
      candidatas.push(lineas[i] + ' ' + (lineas[i + 1] || ''));
    }
  }
  candidatas.push(...lineas);
  for (const candidata of candidatas) {
    const fecha = buscarFecha(candidata);
    if (fecha) return fecha;
  }
  return null;
}

function extraerOperacionVoucher(textoOCR) {
  const texto = textoOCR.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const lineas = texto.split(/\r?\n/).map(linea => linea.trim()).filter(Boolean);
  // Incluye Nro. de operación, operación, N.º de transacción, referencia y constancia.
  const etiqueta = /\b(?:OPERACI[O0]N|OP|TRANSACCI[O0]N|MOVIMIENTO|REFERENCIA|CONSTANCIA)\b/g;

  function obtenerCodigo(cadena) {
    const sinPrefijo = cadena.trim()
      .replace(/^[\s:#.°º=\-]+/, '')
      .replace(/^(?:N(?:RO|UMERO|O)?\.?\s*[°º#]?\s*[:\-]?)\s*/i, '');
    const candidatos = sinPrefijo.match(/[A-Z0-9]{4,}(?:[\s\-][A-Z0-9]{2,}){0,3}/g) || [];
    for (const candidato of candidatos) {
      const codigo = candidato.replace(/[\s\-]/g, '');
      const digitos = (codigo.match(/\d/g) || []).length;
      if (codigo.length >= 5 && codigo.length <= 24 && digitos >= 4) return codigo;
    }
    return null;
  }

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    for (const marca of linea.matchAll(etiqueta)) {
      const anterior = linea.slice(0, marca.index);
      // "Fecha de operación" no es una etiqueta del número de operación.
      if (/\bFECHA\s+(?:DE\s+)?$/.test(anterior)) continue;
      const posterior = linea.slice(marca.index + marca[0].length);
      const codigo = obtenerCodigo(posterior) || (i + 1 < lineas.length ? obtenerCodigo(lineas[i + 1]) : null);
      if (codigo) return codigo;
    }
  }
  return null;
}

module.exports = { extraerFechaVoucher, extraerOperacionVoucher };
