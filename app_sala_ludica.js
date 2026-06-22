// ============================================================
// SANTIAGO CORAZÓN — Registro Salas Lúdicas
// app_sala_ludica.js
// ============================================================

const SUPABASE_URL = 'https://sbhbcgxmxnxyfuzggegj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaGJjZ3hteG54eWZ1emdnZWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI5MDEsImV4cCI6MjA5NDk2ODkwMX0.VgRnvGvKZzKJdAJ4hS4TzEZ9N79ckgHO_LjhdGgiqsc';
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
      $('inDepartamento').value = b.departamento || '';
      $('inMunicipio').value = b.municipio || '';
      $('inComuna').value = b.comuna || '';
      $('inDocAcudiente').value = b.documento_acudiente || '';
      $('inNombreAcudiente').value = b.nombre_acudiente || '';
      $('inCelular').value = b.celular_acudiente || '';
      $('inGeneroAcudiente').value = b.genero_acudiente || '';
      status.className = 'status found';
      status.textContent = '✓ Beneficiario encontrado: ' + b.nombre_paciente;
      status.style.display = 'flex';
    } else {
      S.beneficiarioId = null;
      ['inNombrePaciente','inGeneroPaciente','inRegimen','inEdad','inDepartamento','inMunicipio','inComuna',
       'inDocAcudiente','inNombreAcudiente','inCelular','inGeneroAcudiente'].forEach(id => $(id).value = '');
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
  irA('sec-detalle');
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
  document.querySelectorAll('.pill.sel').forEach(p => p.classList.remove('sel'));
  ['inDocPaciente','inNombrePaciente','inGeneroPaciente','inRegimen','inEdad','inDepartamento','inMunicipio','inComuna',
   'inDocAcudiente','inNombreAcudiente','inCelular','inGeneroAcudiente','inServicio','inObservacion',
   'inAsistentesSala','inActividadSala','inDesayuno','inAlmuerzo','inMerienda','inRefrigerio',
   'inAsistentesFort','inActividadFort','inFecha'].forEach(id => { if ($(id)) $(id).value = ''; });
  $('statusBeneficiario').style.display = 'none';
  irA('sec-componente');
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  $('headerDate').textContent = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
});
