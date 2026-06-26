// ============================================================
// SANTIAGO CORAZÓN — Registro Salas Lúdicas
// app_sala_ludica.js
// ============================================================

const SUPABASE_URL = 'https://sbhbcgxmxnxyfuzggegj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaGJjZ3hteG54eWZ1emdnZWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI5MDEsImV4cCI6MjA5NDk2ODkwMX0.VgRnvGvKZzKJdAJ4hS4TzEZ9N79ckgHO_LjhdGgiqsc';
const STORAGE_BUCKET = 'salaludica-evidencias';
const sbH = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY });
const $ = id => document.getElementById(id);

const COMPONENTE_LABELS = {
  kits_bienvenida: { titulo: 'Kit de Bienvenida', sub: 'Registra a quién se le entregó el kit.' },
  sala_ludica: { titulo: 'Sala Lúdica', sub: 'Registra la actividad de estimulación realizada.' },
  apoyo_alimentario: { titulo: 'Apoyo Alimentario', sub: 'Registra las raciones entregadas en esta visita.' },
  fortalecimiento_cuidadores: { titulo: 'Fortalecimiento a Cuidadores', sub: 'Registra el taller o acompañamiento al cuidador.' },
};

const S = {
  componente: '',
  beneficiarioId: null,   // id existente en sl_beneficiarios, si se encontró
  kitPaciente: false,
  kitAcudiente: false,
  etapaPanales: null,
  fotoBlob: null,
  fotoExt: 'jpg',
};

function loading(show, msg) {
  $('loadingOverlay').style.display = show ? 'flex' : 'none';
  if (msg) $('loadingMsg').textContent = msg;
}

function irA(secId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(secId).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── PASO 1: Componente ──────────────────────────────────────
function selComponente(c) {
  S.componente = c;
  irA('sec-beneficiario');
}

// ── Selector en cascada: Departamento → Municipio → Comuna ──
function cargarDepartamentosSL() {
  const deptos = [...new Set(MUNICIPIOS_CO.map(x => x.d))].sort((a, b) => a.localeCompare(b, 'es'));
  // Antioquia primero (región principal de la Fundación)
  deptos.sort((a, b) => (a === 'Antioquia' ? -1 : b === 'Antioquia' ? 1 : 0));
  $('inDepartamento').innerHTML = '<option value="">Seleccionar departamento...</option>' +
    deptos.map(d => `<option value="${d}">${d}</option>`).join('');
}

function cargarMunicipiosSL() {
  const depto = $('inDepartamento').value;
  const sel = $('inMunicipio');
  if (!depto) {
    sel.innerHTML = '<option value="">Primero elige el departamento...</option>';
    $('comunaWrap').style.display = 'none';
    return;
  }
  const munis = MUNICIPIOS_CO.filter(x => x.d === depto).map(x => x.m).sort((a, b) => a.localeCompare(b, 'es'));
  sel.innerHTML = '<option value="">Seleccionar municipio...</option>' +
    munis.map(m => `<option value="${m}">${m}</option>`).join('');
  $('comunaWrap').style.display = 'none';
}

function onMunicipioSeleccionadoSL() {
  const muni = $('inMunicipio').value;
  const comunaWrap = $('comunaWrap');
  const sel = $('inComuna');
  const esMedellin = muni.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'medellin';
  if (esMedellin) {
    comunaWrap.style.display = 'block';
    sel.innerHTML = '<option value="">Seleccionar</option>' + COMUNAS_MEDELLIN.map(c => `<option>${c}</option>`).join('');
  } else {
    comunaWrap.style.display = 'none';
    sel.innerHTML = '<option value="No aplica" selected>No aplica</option>';
    sel.value = 'No aplica';
  }
}

function setDepartamentoMunicipioSL(depto, muni) {
  if (depto) $('inDepartamento').value = depto;
  cargarMunicipiosSL();
  if (muni) $('inMunicipio').value = muni;
  onMunicipioSeleccionadoSL();
}

// ── PASO 2: Beneficiario ─────────────────────────────────────
async function buscarBeneficiario() {
  const doc = $('inDocPaciente').value.trim();
  const status = $('statusBeneficiario');
  status.style.display = 'none';
  if (!doc) return;

  loading(true, 'Buscando...');
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/sl_beneficiarios?documento_paciente=eq.' + encodeURIComponent(doc) + '&limit=1',
      { headers: sbH() }
    );
    const data = await r.json();
    if (data && data.length) {
      const b = data[0];
      S.beneficiarioId = b.id;
      $('inNombrePaciente').value = b.nombre_paciente || '';
      $('inGeneroPaciente').value = b.genero_paciente || '';
      $('inRegimen').value = b.regimen_salud || '';
      $('inEdad').value = b.edad_texto || '';
      $('inDocAcudiente').value = b.documento_acudiente || '';
      $('inNombreAcudiente').value = b.nombre_acudiente || '';
      $('inCelular').value = b.celular_acudiente || '';
      $('inGeneroAcudiente').value = b.genero_acudiente || '';

      if (b.municipio) {
        setDepartamentoMunicipioSL(b.departamento || '', b.municipio);
        if (b.comuna && $('comunaWrap').style.display === 'block') $('inComuna').value = b.comuna;
      } else {
        $('inDepartamento').value = '';
        cargarMunicipiosSL();
      }

      status.className = 'status found';
      status.textContent = '✓ Beneficiario encontrado: ' + b.nombre_paciente;
      status.style.display = 'flex';
    } else {
      S.beneficiarioId = null;
      ['inNombrePaciente','inGeneroPaciente','inRegimen','inEdad',
       'inDocAcudiente','inNombreAcudiente','inCelular','inGeneroAcudiente'].forEach(id => $(id).value = '');
      $('inDepartamento').value = '';
      cargarMunicipiosSL();
      status.className = 'status notfound';
      status.textContent = 'No se encontró. Completa los datos para crearlo.';
      status.style.display = 'flex';
    }
  } catch (e) {
    console.error(e);
    alert('No se pudo conectar con la base de datos. Revisa tu conexión e intenta de nuevo.');
  } finally {
    loading(false);
  }
}

function irADetalle() {
  if (!$('inDocPaciente').value.trim() || !$('inNombrePaciente').value.trim()) {
    alert('El documento y el nombre del paciente son obligatorios.');
    return;
  }
  const c = S.componente;
  $('tituloDetalle').innerHTML = 'Detalle de <em>' + COMPONENTE_LABELS[c].titulo + '</em>';
  $('subDetalle').textContent = COMPONENTE_LABELS[c].sub;
  ['kits_bienvenida','sala_ludica','apoyo_alimentario','fortalecimiento_cuidadores'].forEach(comp => {
    $('campos-' + comp).style.display = (comp === c) ? 'block' : 'none';
  });
  if (!$('inFecha').value) {
    $('inFecha').value = new Date().toISOString().slice(0, 10);
  }
  if (!$('inFirmaNombre').value) {
    $('inFirmaNombre').value = $('inNombreAcudiente').value || $('inNombrePaciente').value || '';
  }
  irA('sec-detalle');
  setTimeout(initFirmaCanvas, 50); // esperar a que el canvas sea visible para medir su tamaño real
}

// ── Pills (selección visual) ────────────────────────────────
function selPill(el) {
  el.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  S.etapaPanales = el.dataset.val === 'true';
}
function togglePill(el) {
  el.classList.toggle('sel');
  S[el.dataset.target] = el.classList.contains('sel');
}

// ── Foto de evidencia ────────────────────────────────────────
function onFotoSeleccionada(event) {
  const file = event.target.files[0];
  if (!file) return;
  S.fotoBlob = file;
  S.fotoExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const reader = new FileReader();
  reader.onload = e => {
    $('fotoPreview').src = e.target.result;
    $('fotoPreviewWrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function quitarFoto() {
  S.fotoBlob = null;
  $('inFoto').value = '';
  $('fotoPreviewWrap').style.display = 'none';
}

// ── Firma digital (canvas) ───────────────────────────────────
let firmaCtx = null, firmaDibujando = false, firmaTieneTrazo = false;
function initFirmaCanvas() {
  const canvas = $('firmaCanvas');
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300, h = canvas.clientHeight || 160;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  firmaCtx = canvas.getContext('2d');
  firmaCtx.scale(ratio, ratio);
  firmaCtx.lineWidth = 2.2;
  firmaCtx.lineCap = 'round';
  firmaCtx.strokeStyle = '#1a0a10';
  firmaTieneTrazo = false;

  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };
  const start = (e) => { firmaDibujando = true; const p = pos(e); firmaCtx.beginPath(); firmaCtx.moveTo(p.x, p.y); e.preventDefault(); };
  const move = (e) => {
    if (!firmaDibujando) return;
    const p = pos(e); firmaCtx.lineTo(p.x, p.y); firmaCtx.stroke(); firmaTieneTrazo = true; e.preventDefault();
  };
  const end = () => { firmaDibujando = false; };

  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}
function limpiarFirma() {
  const canvas = $('firmaCanvas');
  if (firmaCtx) firmaCtx.clearRect(0, 0, canvas.width, canvas.height);
  firmaTieneTrazo = false;
}
function firmaABlob() {
  return new Promise(resolve => {
    if (!firmaTieneTrazo) { resolve(null); return; }
    $('firmaCanvas').toBlob(blob => resolve(blob), 'image/png');
  });
}

// ── Subida a Supabase Storage ────────────────────────────────
async function subirArchivo(path, blob, contentType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...sbH(), 'Content-Type': contentType },
    body: blob,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error('No se pudo subir el archivo (' + (err.message || r.status) + ')');
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

// ── PASO 3 → Resumen ─────────────────────────────────────────
function irAResumen() {
  if (!$('inFecha').value) { alert('Selecciona la fecha del registro.'); return; }

  const c = S.componente;
  let detalleHtml = '';

  if (c === 'kits_bienvenida') {
    detalleHtml += linea('Etapa de pañales', S.etapaPanales === null ? '—' : (S.etapaPanales ? 'Sí' : 'No'));
    detalleHtml += linea('Kit entregado a', [S.kitPaciente && 'Paciente', S.kitAcudiente && 'Acudiente'].filter(Boolean).join(', ') || '—');
  } else if (c === 'sala_ludica') {
    if (!$('inActividadSala').value) { alert('Selecciona el tipo de actividad.'); return; }
    detalleHtml += linea('Asistentes', $('inAsistentesSala').value || '—');
    detalleHtml += linea('Actividad', $('inActividadSala').value);
  } else if (c === 'apoyo_alimentario') {
    const total = ['inDesayuno','inAlmuerzo','inMerienda','inRefrigerio'].reduce((s, id) => s + (Number($(id).value) || 0), 0);
    if (total === 0) { alert('Registra al menos una ración entregada.'); return; }
    detalleHtml += linea('Desayuno', $('inDesayuno').value || '0');
    detalleHtml += linea('Almuerzo', $('inAlmuerzo').value || '0');
    detalleHtml += linea('Merienda', $('inMerienda').value || '0');
    detalleHtml += linea('Refrigerio', $('inRefrigerio').value || '0');
  } else if (c === 'fortalecimiento_cuidadores') {
    if (!$('inActividadFort').value.trim()) { alert('Describe la actividad o taller.'); return; }
    detalleHtml += linea('Asistentes', $('inAsistentesFort').value || '—');
    detalleHtml += linea('Actividad', $('inActividadFort').value);
  }

  $('resumenContenido').innerHTML = `
    <div class="ficha-box">
      <strong>${$('inNombrePaciente').value}</strong> · Doc. ${$('inDocPaciente').value}<br>
      ${COMPONENTE_LABELS[c].titulo} · ${$('inFecha').value}
    </div>
    ${linea('Servicio', $('inServicio').value || '—')}
    ${detalleHtml}
    ${linea('Foto adjunta', S.fotoBlob ? 'Sí' : 'No')}
    ${linea('Firma', firmaTieneTrazo ? 'Sí, de ' + ($('inFirmaNombre').value || '—') : 'No')}
    ${linea('Autoriza uso de imagen', $('inAutorizaImagen').checked ? 'Sí' : 'No')}
    ${linea('Observación', $('inObservacion').value || '—')}
  `;
  irA('sec-resumen');
}

function linea(label, valor) {
  return `<div class="resumen-line"><span>${label}</span><span>${valor}</span></div>`;
}

// ── Guardado en Supabase ─────────────────────────────────────
async function guardarRegistro() {
  loading(true, 'Guardando registro...');
  try {
    let beneficiarioId = S.beneficiarioId;

    const beneficiarioPayload = {
      documento_paciente: $('inDocPaciente').value.trim(),
      nombre_paciente: $('inNombrePaciente').value.trim(),
      genero_paciente: $('inGeneroPaciente').value || null,
      regimen_salud: $('inRegimen').value || null,
      departamento: $('inDepartamento').value.trim() || null,
      municipio: $('inMunicipio').value.trim() || null,
      comuna: $('inComuna').value.trim() || null,
      edad_texto: $('inEdad').value.trim() || null,
      documento_acudiente: $('inDocAcudiente').value.trim() || null,
      nombre_acudiente: $('inNombreAcudiente').value.trim() || null,
      celular_acudiente: $('inCelular').value.trim() || null,
      genero_acudiente: $('inGeneroAcudiente').value || null,
    };

    if (beneficiarioId) {
      await fetch(SUPABASE_URL + '/rest/v1/sl_beneficiarios?id=eq.' + beneficiarioId, {
        method: 'PATCH',
        headers: { ...sbH(), 'Content-Type': 'application/json' },
        body: JSON.stringify(beneficiarioPayload),
      });
    } else {
      const r = await fetch(SUPABASE_URL + '/rest/v1/sl_beneficiarios', {
        method: 'POST',
        headers: { ...sbH(), 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(beneficiarioPayload),
      });
      const created = await r.json();
      if (!r.ok) throw new Error(created.message || 'No se pudo crear el beneficiario');
      beneficiarioId = created[0].id;
    }

    // ── Subir foto y firma (si existen) ──
    const sello = Date.now() + '_' + (beneficiarioId || 'na');
    let fotoUrl = null, firmaUrl = null;

    if (S.fotoBlob) {
      loading(true, 'Subiendo foto...');
      fotoUrl = await subirArchivo(`fotos/${sello}.${S.fotoExt}`, S.fotoBlob, S.fotoBlob.type || 'image/jpeg');
    }
    const firmaBlob = await firmaABlob();
    if (firmaBlob) {
      loading(true, 'Guardando firma...');
      firmaUrl = await subirArchivo(`firmas/${sello}.png`, firmaBlob, 'image/png');
    }

    loading(true, 'Guardando registro...');
    const c = S.componente;
    const registro = {
      beneficiario_id: beneficiarioId,
      componente: c,
      fecha: $('inFecha').value,
      servicio: $('inServicio').value || null,
      observacion: $('inObservacion').value.trim() || null,
      etapa_panales: c === 'kits_bienvenida' ? S.etapaPanales : null,
      kit_paciente: c === 'kits_bienvenida' ? S.kitPaciente : null,
      kit_acudiente: c === 'kits_bienvenida' ? S.kitAcudiente : null,
      asistentes_sala_ludica: c === 'sala_ludica' ? Number($('inAsistentesSala').value) || null : null,
      actividad_sala_ludica: c === 'sala_ludica' ? $('inActividadSala').value || null : null,
      desayuno: c === 'apoyo_alimentario' ? (Number($('inDesayuno').value) || null) : null,
      almuerzo: c === 'apoyo_alimentario' ? (Number($('inAlmuerzo').value) || null) : null,
      merienda: c === 'apoyo_alimentario' ? (Number($('inMerienda').value) || null) : null,
      refrigerio: c === 'apoyo_alimentario' ? (Number($('inRefrigerio').value) || null) : null,
      asistentes_fortalecimiento: c === 'fortalecimiento_cuidadores' ? Number($('inAsistentesFort').value) || null : null,
      actividad_fortalecimiento: c === 'fortalecimiento_cuidadores' ? $('inActividadFort').value.trim() || null : null,
      foto_url: fotoUrl,
      firma_url: firmaUrl,
      firma_nombre: firmaUrl ? ($('inFirmaNombre').value.trim() || null) : null,
      autorizacion_imagen: $('inAutorizaImagen').checked,
    };

    const rr = await fetch(SUPABASE_URL + '/rest/v1/sl_registros', {
      method: 'POST',
      headers: { ...sbH(), 'Content-Type': 'application/json' },
      body: JSON.stringify(registro),
    });
    if (!rr.ok) {
      const err = await rr.json();
      throw new Error(err.message || 'No se pudo guardar el registro');
    }

    $('okMsg').textContent = COMPONENTE_LABELS[c].titulo + ' registrado para ' + $('inNombrePaciente').value + '.';
    irA('sec-ok');
  } catch (e) {
    console.error(e);
    alert('Ocurrió un error guardando el registro: ' + e.message);
  } finally {
    loading(false);
  }
}

function nuevoRegistro() {
  S.componente = '';
  S.beneficiarioId = null;
  S.kitPaciente = false;
  S.kitAcudiente = false;
  S.etapaPanales = null;
  S.fotoBlob = null;
  document.querySelectorAll('.pill.sel').forEach(p => p.classList.remove('sel'));
  ['inDocPaciente','inNombrePaciente','inGeneroPaciente','inRegimen','inEdad',
   'inDocAcudiente','inNombreAcudiente','inCelular','inGeneroAcudiente','inServicio','inObservacion',
   'inAsistentesSala','inActividadSala','inDesayuno','inAlmuerzo','inMerienda','inRefrigerio',
   'inAsistentesFort','inActividadFort','inFecha','inFirmaNombre'].forEach(id => { if ($(id)) $(id).value = ''; });
  $('inDepartamento').value = '';
  cargarMunicipiosSL();
  $('inAutorizaImagen').checked = false;
  quitarFoto();
  limpiarFirma();
  $('statusBeneficiario').style.display = 'none';
  irA('sec-componente');
}

// ── Init ──────────────────────────────────────────────────────
let MODO_SOLO_ENCUESTA = false;

document.addEventListener('DOMContentLoaded', () => {
  $('headerDate').textContent = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  cargarDepartamentosSL();
  cargarMunicipiosSL();

  // ── Link individual de encuesta: ?encuesta=1 (elige componente)
  //    o ?encuesta=sala_ludica / kits_bienvenida / apoyo_alimentario / fortalecimiento_cuidadores (va directo)
  const params = new URLSearchParams(location.search);
  if (params.has('encuesta')) {
    MODO_SOLO_ENCUESTA = true;
    document.title = 'Encuesta de Satisfacción — Santiago Corazón';
    if ($('headerTitulo')) $('headerTitulo').textContent = 'Encuesta de Satisfacción';
    if ($('btnAtrasEncuestaComp')) $('btnAtrasEncuestaComp').style.display = 'none';
    if ($('btnAtrasEncuestaTodos')) $('btnAtrasEncuestaTodos').style.display = 'none';
    if ($('btnFinEncuesta')) {
      $('btnFinEncuesta').outerHTML = '<div style="color:var(--ink-lt);font-size:.85rem;text-align:center;padding-top:6px">Ya puedes cerrar esta ventana.</div>';
    }
    const valor = params.get('encuesta');
    if (valor === 'todos') {
      irAEncuestaTodos();
    } else if (ENCUESTA_CONFIG[valor]) {
      selComponenteEncuesta(valor);
    } else {
      irAEncuestaComponente();
    }
  }
});

// ============================================================
// ENCUESTA DE SATISFACCIÓN
// ============================================================
const ENCUESTA_CONFIG = {
  sala_ludica: {
    titulo: 'Sala Lúdica',
    pregunta: 'Las actividades en la sala lúdica ayudaron a: (Puedes marcar más de una opción)',
    tipo: 'multi',
    opciones: [
      'Reducir el estrés del niño.',
      'Hacer más llevadera la espera y hospitalización.',
      'Fortalecer el bienestar emocional del niño y la familia.',
      'No generaron mayor impacto.',
      'No participé en las actividades.',
    ],
  },
  kits_bienvenida: {
    titulo: 'Kits de Bienvenida',
    pregunta: 'Durante la estadía en la Clínica, los productos del kit de bienvenida (aseo y cuidado personal) entregados fueron:',
    tipo: 'single',
    opciones: ['Muy útiles.', 'Útiles en parte.', 'Poco útiles.', 'No fueron útiles.'],
  },
  apoyo_alimentario: {
    titulo: 'Apoyo Alimentario',
    pregunta: 'Durante la hospitalización de tu hijo(a), ¿qué tan importante fue para tu familia contar con el apoyo en alimentación (desayunos, almuerzos o meriendas)?',
    tipo: 'single',
    opciones: ['Muy importante.', 'Importante.', 'Poco importante.', 'No fue necesario.', 'No recibí este apoyo.'],
  },
  fortalecimiento_cuidadores: {
    titulo: 'Talleres y Acompañamiento a Cuidadoras',
    pregunta: '¿Cómo calificarías los talleres y espacios de acompañamiento para madres y cuidadoras (psicología, manualidades, salud oral, etc.) en los que participaste?',
    tipo: 'single',
    opciones: [
      'Excelente: Me brindaron herramientas útiles para mi bienestar y autocuidado.',
      'Bueno: Fueron espacios agradables de distracción.',
      'Regular: No sentí que aportaran a mi situación actual.',
      'No participé en los talleres para cuidadoras.',
    ],
  },
};

const ES = { componente: '', seleccion: [] };
const ET = { sala_ludica: [], kits_bienvenida: '', apoyo_alimentario: '', fortalecimiento_cuidadores: '' };

function irAEncuestaComponente() {
  ES.componente = '';
  ES.seleccion = [];
  irA('sec-encuesta-componente');
}

function selComponenteEncuesta(c) {
  ES.componente = c;
  ES.seleccion = [];
  renderEncuestaForm();
  irA('sec-encuesta-form');
}

function renderEncuestaForm() {
  const cfg = ENCUESTA_CONFIG[ES.componente];
  $('encTitulo').innerHTML = 'Evaluación de <em>' + cfg.titulo + '</em>';
  $('encPregunta').textContent = cfg.pregunta;
  $('encComentario').value = '';

  if (cfg.tipo === 'multi') {
    $('encOpciones').innerHTML = cfg.opciones.map((op, i) => `
      <div class="check-row">
        <input type="checkbox" id="encOp${i}" data-val="${op.replace(/"/g, '&quot;')}" onchange="toggleOpcionEncuesta(this)">
        <label for="encOp${i}">${op}</label>
      </div>
    `).join('');
  } else {
    $('encOpciones').innerHTML = `<div class="pill-row" style="flex-direction:column;align-items:stretch">` +
      cfg.opciones.map(op => `<div class="pill" data-val="${op.replace(/"/g, '&quot;')}" onclick="selOpcionEncuesta(this)">${op}</div>`).join('') +
      `</div>`;
  }
}

function toggleOpcionEncuesta(el) {
  const valor = el.dataset.val;
  if (el.checked) {
    if (!ES.seleccion.includes(valor)) ES.seleccion.push(valor);
  } else {
    ES.seleccion = ES.seleccion.filter(v => v !== valor);
  }
}

function selOpcionEncuesta(el) {
  el.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  ES.seleccion = [el.dataset.val];
}

async function guardarEncuesta() {
  if (!ES.seleccion.length) {
    alert('Selecciona al menos una opción antes de enviar.');
    return;
  }
  loading(true, 'Enviando encuesta...');
  try {
    const payload = {
      componente: ES.componente,
      respuestas: ES.seleccion,
      comentario: $('encComentario').value.trim() || null,
    };
    const r = await fetch(SUPABASE_URL + '/rest/v1/encuesta_satisfaccion', {
      method: 'POST',
      headers: { ...sbH(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo guardar la encuesta');
    }
    irA('sec-encuesta-ok');
  } catch (e) {
    console.error(e);
    alert('Ocurrió un error enviando la encuesta: ' + e.message);
  } finally {
    loading(false);
  }
}

// ── Encuesta combinada: los 4 servicios en un solo formulario ──
function irAEncuestaTodos() {
  ET.sala_ludica = [];
  ET.kits_bienvenida = '';
  ET.apoyo_alimentario = '';
  ET.fortalecimiento_cuidadores = '';
  renderEncuestaTodos();
  irA('sec-encuesta-todos');
}

function renderEncuestaTodos() {
  $('encTodosComentario').value = '';
  $('encTodosContenido').innerHTML = Object.keys(ENCUESTA_CONFIG).map(key => {
    const cfg = ENCUESTA_CONFIG[key];
    let opcionesHtml;
    if (cfg.tipo === 'multi') {
      opcionesHtml = cfg.opciones.map((op, i) => `
        <div class="check-row">
          <input type="checkbox" id="encTodos_${key}_${i}" data-comp="${key}" data-val="${op.replace(/"/g, '&quot;')}" onchange="toggleOpcionEncuestaTodos(this)">
          <label for="encTodos_${key}_${i}">${op}</label>
        </div>`).join('');
    } else {
      opcionesHtml = `<div class="pill-row" style="flex-direction:column;align-items:stretch">` +
        cfg.opciones.map(op => `<div class="pill" data-comp="${key}" data-val="${op.replace(/"/g, '&quot;')}" onclick="selOpcionEncuestaTodos(this)">${op}</div>`).join('') +
        `</div>`;
    }
    return `
      <div style="margin-bottom:26px;padding-bottom:18px;border-bottom:1px solid var(--border)">
        <div style="font-weight:600;font-size:.95rem;color:var(--ink);margin-bottom:4px">${cfg.titulo}</div>
        <div style="font-size:.83rem;color:var(--ink-lt);margin-bottom:12px">${cfg.pregunta}</div>
        ${opcionesHtml}
      </div>`;
  }).join('');
}

function toggleOpcionEncuestaTodos(el) {
  const comp = el.dataset.comp, valor = el.dataset.val;
  if (el.checked) {
    if (!ET[comp].includes(valor)) ET[comp].push(valor);
  } else {
    ET[comp] = ET[comp].filter(v => v !== valor);
  }
}

function selOpcionEncuestaTodos(el) {
  const comp = el.dataset.comp;
  el.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
  ET[comp] = el.dataset.val;
}

async function guardarEncuestaTodos() {
  const comentario = $('encTodosComentario').value.trim() || null;
  const filas = Object.keys(ENCUESTA_CONFIG).map(key => {
    const cfg = ENCUESTA_CONFIG[key];
    const valor = ET[key];
    const respuestas = cfg.tipo === 'multi' ? valor : (valor ? [valor] : []);
    return respuestas.length ? { componente: key, respuestas, comentario } : null;
  }).filter(Boolean);

  if (!filas.length) {
    alert('Responde al menos una pregunta antes de enviar.');
    return;
  }

  loading(true, 'Enviando encuesta...');
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/encuesta_satisfaccion', {
      method: 'POST',
      headers: { ...sbH(), 'Content-Type': 'application/json' },
      body: JSON.stringify(filas),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo guardar la encuesta');
    }
    irA('sec-encuesta-ok');
  } catch (e) {
    console.error(e);
    alert('Ocurrió un error enviando la encuesta: ' + e.message);
  } finally {
    loading(false);
  }
}
