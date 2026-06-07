// ============================================================
// SANTIAGO CORAZÓN — Formulario de Pedidos
// app.js — Toda la lógica del formulario
// ============================================================

// ── Configuración Supabase ──────────────────────────────────
const SUPABASE_URL = 'https://sbhbcgxmxnxyfuzggegj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaGJjZ3hteG54eWZ1emdnZWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTI5MDEsImV4cCI6MjA5NDk2ODkwMX0.VgRnvGvKZzKJdAJ4hS4TzEZ9N79ckgHO_LjhdGgiqsc';
const sbH = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY });

// ── Utilidades ──────────────────────────────────────────────
const fmt    = n => '$ ' + Math.max(0, Number(n)).toLocaleString('es-CO');
const $      = id => document.getElementById(id);
const today  = () => new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });
const newNum = () => 'SC-' + Date.now().toString().slice(-7);
let orderNum = newNum();

// ── Estado global ───────────────────────────────────────────
let CATALOGO   = {};
let ENVIOS_DB  = [];

const S = {
  tipoPedido:'', tipoCliente:'Personal', canal:'',
  comprador:{}, destinatario:{},
  fallecido:'', dirigido:'', quienAtiende:'', tarjeta:'', mensaje:'', firma:'', notas:'',
  ocasion:'',
  bonos:[], sinBono:false, bono:null, empaque:null,
  acompanantes:[], productosElegidos:[],
  envio:null, valorDonacion:0, campana_id:null, campana:'', campana_tipo:'',
  productosDonacion:[],
  metodoPago:'', atendidoPor:'', esNuevo:false,
  evento_id:null, evento:'',
  flujo:[], flujoIdx:0,
};

const FLUJOS = {
  pesame:      ['sec-1','sec-2','sec-3-pesame','sec-4-bono','sec-acompanante','sec-envio','sec-orden'],
  toda_ocasion:['sec-1','sec-2','sec-3-toda','sec-4-bono','sec-acompanante','sec-envio','sec-orden'],
  producto:    ['sec-1','sec-2','sec-3-producto','sec-productos','sec-envio','sec-orden'],
  empresarial: ['sec-1','sec-2','sec-3-producto','sec-productos','sec-envio','sec-orden'],
  donacion:    ['sec-1','sec-3-donacion','sec-orden'],
  campana:     ['sec-1','sec-2','sec-productos-campana','sec-envio','sec-orden'],
  evento:      ['sec-1','sec-2','sec-productos-evento','sec-envio','sec-orden'],
  temporada:   ['sec-1','sec-2','sec-productos-temporada','sec-envio','sec-orden'],
};

const PASOS_LABELS = {
  pesame:      ['Comprador','Destinatario','Info Bono','Presentación','Acompañante','Envío','Orden'],
  toda_ocasion:['Comprador','Destinatario','Info Bono','Presentación','Acompañante','Envío','Orden'],
  producto:    ['Comprador','Destinatario','Ocasión','Productos','Envío','Orden'],
  empresarial: ['Comprador','Destinatario','Ocasión','Productos','Envío','Orden'],
  donacion:    ['Comprador','Donación','Orden'],
  campana:     ['Comprador','Destinatario','Campaña','Envío','Orden'],
  evento:      ['Comprador','Destinatario','Evento','Envío','Orden'],
  temporada:   ['Comprador','Destinatario','Temporada','Envío','Orden'],
};

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  $('headerDate').textContent = today();
  $('loadingMsg').textContent = 'Cargando...';
  $('loadingOverlay').classList.add('show');
  await Promise.all([
    cargarCatalogo(),
    cargarColoresBonos(),
    cargarEnviosDB(),
    cargarTemporadaActiva(),
    cargarDepartamentos(),
  ]);
  $('loadingOverlay').classList.remove('show');
});

// ── Catálogo ────────────────────────────────────────────────
async function cargarCatalogo() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/catalogo?activo=eq.true&order=orden.asc', { headers: sbH() });
    const data = await r.json();
    CATALOGO = {
      bonos_base:   data.filter(p => p.tipo === 'bono_base' && p.es_bono),
      empaques:     data.filter(p => p.tipo === 'empaque' && !p.es_bono),
      acompanantes: data.filter(p => p.tipo === 'acompanante'),
      productos:    data.filter(p => p.tipo === 'acompanante'),
      empresarial:  data.filter(p => p.tipo === 'empresarial'),
    };
  } catch(e) { console.error('Error catálogo:', e); }
  await cargarCampanas();
}

async function cargarCampanas() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/campanas?activo=eq.true&order=nombre.asc', { headers: sbH() });
    window._campanas = await r.json();
    const sel = $('p_campana');
    if (sel) {
      sel.innerHTML = '<option value="">— Selecciona una campaña —</option>' +
        window._campanas.map(c =>
          '<option value="' + c.id + '" data-tipo="' + (c.tipo_recaudo||'dinero') + '">' +
          c.nombre + (c.descripcion ? ' — ' + c.descripcion : '') + '</option>'
        ).join('');
    }
  } catch(e) { console.error('Error campañas:', e); }
}

async function onCampanaChange() {
  const sel = $('p_campana');
  if (!sel || !sel.value) return;
  const opt = sel.options[sel.selectedIndex];
  const tipo = opt.dataset.tipo || 'dinero';
  S.campana_id = sel.value;
  S.campana = opt.text;
  S.campana_tipo = tipo;
  const secDinero   = $('sec-donacion-dinero');
  const secProductos = $('sec-donacion-productos');
  if (secDinero) secDinero.style.display = (tipo === 'dinero' || tipo === 'ambos') ? 'block' : 'none';
  if (secProductos) secProductos.style.display = (tipo === 'productos' || tipo === 'ambos') ? 'block' : 'none';
  if (tipo === 'productos' || tipo === 'ambos') {
    try {
      const r = await fetch(SUPABASE_URL + '/rest/v1/campana_productos?campana_id=eq.' + sel.value + '&activo=eq.true&order=orden.asc', { headers: sbH() });
      const prods = await r.json();
      const grid = $('grid-donacion-productos');
      if (grid) {
        S.productosDonacion = [];
        if (prods.length) {
          grid.innerHTML = prods.map(function(p) {
            var img = p.imagen_url ? '<img src="' + p.imagen_url + '" onerror="this.style.display=\'none\'">' : '';
            var desc = p.descripcion ? '<div style="font-size:.72rem;color:var(--ink-lt)">' + p.descripcion + '</div>' : '';
            return '<div class="prod-card" id="dprod-' + p.id + '" onclick="selProdDonacion(' + p.id + ',\'' + p.nombre.replace(/'/g,"&#39;") + '\',' + p.precio + ')">' +
              img + '<div class="prod-info"><div class="prod-nombre">' + p.nombre + '</div>' + desc +
              '<div class="prod-precio">' + fmt(p.precio) + '</div></div></div>';
          }).join('');
        } else {
          grid.innerHTML = '<p style="color:var(--ink-lt);font-size:.83rem">No hay productos configurados para esta campaña.</p>';
        }
      }
    } catch(e) { console.warn('Error productos campaña:', e); }
  }
  actualizarTotal();
}

function selProdDonacion(id, nombre, precio) {
  if (!S.productosDonacion) S.productosDonacion = [];
  const idx = S.productosDonacion.findIndex(p => p.id === id);
  const card = $('dprod-' + id);
  if (idx >= 0) { S.productosDonacion.splice(idx, 1); if (card) card.classList.remove('sel'); }
  else { S.productosDonacion.push({ id, nombre, precio, qty:1 }); if (card) card.classList.add('sel'); }
  actualizarTotal();
}

// ── Colores de bonos desde Supabase ────────────────────────
async function cargarColoresBonos() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/colores_bono?activo=eq.true&order=orden.asc', { headers: sbH() });
    const colores = await r.json();
    renderColoresBono('tarjeta-grid-pesame', colores.filter(c => c.tipo_bono === 'pesame'), 'pesame');
    renderColoresBono('tarjeta-grid-toda', colores.filter(c => c.tipo_bono === 'toda_ocasion'), 'toda');
  } catch(e) { console.error('Error colores:', e); }
}

function renderColoresBono(containerId, colores, tipo) {
  var el = $(containerId);
  if (!el) return;
  if (!colores.length) { el.innerHTML = '<div style="color:var(--ink-lt);font-size:.85rem">No hay colores configurados</div>'; return; }
  el.innerHTML = colores.map(function(c) {
    var safe = (c.nombre + (c.frase ? ' - ' + c.frase : '')).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    var img  = c.imagen_url ? '<img src="' + c.imagen_url + '" onerror="this.style.display=\'none\'">' : '';
    var frase = c.frase ? '<div class="tarjeta-frase">' + c.frase + '</div>' : '';
    return '<div class="tarjeta-card" onclick="selTarjeta(this,\'' + safe + '\',\'' + tipo + '\')">' +
      img + '<div class="tarjeta-info">' + frase + '<div class="tarjeta-color">' + c.nombre + '</div></div></div>';
  }).join('');
}

// ── Envíos desde Supabase ───────────────────────────────────
async function cargarEnviosDB() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/tarifas_envio?activo=eq.true&order=orden.asc', { headers: sbH() });
    ENVIOS_DB = await r.json();
  } catch(e) { console.error('Error envíos:', e); }
}

function renderEnvios() {
  if (!ENVIOS_DB.length) {
    $('envioOpts').innerHTML = '<div style="color:var(--ink-lt);font-size:.85rem;padding:10px">Cargando opciones de envío...</div>';
    return;
  }
  $('envioOpts').innerHTML = ENVIOS_DB.map(function(e) {
    var sel   = S.envio && S.envio.l === e.descripcion ? ' sel' : '';
    var color = e.precio === 0 ? '#2e7d32' : 'var(--pink)';
    var precio = e.precio === 0 ? 'GRATIS' : fmt(e.precio);
    var desc  = (e.descripcion || '').replace(/"/g, '&quot;');
    return '<div class="envio-item' + sel + '" onclick="selEnvio(this,' + e.precio + ')" data-label="' + desc + '">' +
      '<span class="envio-label">' + e.descripcion + '</span>' +
      '<span class="envio-precio" style="color:' + color + '">' + precio + '</span></div>';
  }).join('');
}

function selEnvio(el, precio) {
  S.envio = { l: el.dataset.label, p: precio };
  renderEnvios();
  actualizarTotal();
}

// ── Temporada activa ────────────────────────────────────────
async function cargarTemporadaActiva() {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/temporada?activo=eq.true&limit=1', { headers: sbH() });
    const data = await r.json();
    if (data.length) {
      const t = data[0];
      window._temporadaActiva = t;
      var btn = $('btn-temporada');
      if (btn) {
        btn.style.display = '';
        $('icon-temporada').textContent = t.emoji || '🎁';
        $('name-temporada').textContent = t.nombre_boton || 'Temporada';
        $('desc-temporada').textContent = t.descripcion || '';
      }
    }
  } catch(e) { console.error('Error temporada:', e); }
}

// ── Departamentos y municipios ──────────────────────────────
async function cargarDepartamentos() {
  var deptos = [
    'Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas',
    'Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca',
    'Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño',
    'Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia',
    'Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada','Bogotá D.C.'
  ];
  var sel = $('d_departamento');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona departamento...</option>' +
    deptos.map(d => '<option value="' + d + '">' + d + '</option>').join('');
}

function cargarMunicipios() {
  var depto = $('d_departamento').value;
  var selCiudad = $('d_ciudad');
  if (!selCiudad) return;
  var munis = {
    'Amazonas':['El Encanto','La Chorrera','La Pedrera','La Victoria','Leticia','Miriti-Paraná','Puerto Alegría','Puerto Arica','Puerto Nariño','Puerto Santander','Tarapacá'],
    'Antioquia':['Abejorral','Abriaquí','Alejandría','Amagá','Amalfi','Andes','Angelópolis','Angostura','Anorí','Anzá','Apartadó','Arboletes','Argelia','Armenia','Barbosa','Bello','Belmira','Betania','Betulia','Briceño','Buriticá','Caicedo','Caldas','Campamento','Caracolí','Caramanta','Carepa','Carolina del Príncipe','Caucasia','Cañasgordas','Chigorodó','Cisneros','Ciudad Bolívar','Cocorná','Concepción','Concordia','Copacabana','Cáceres','Dabeiba','Don Matías','Ebéjico','El Bagre','El Carmen de Viboral','El Peñol','El Retiro','El Santuario','Entrerríos','Envigado','Fredonia','Frontino','Giraldo','Girardota','Granada','Guadalupe','Guarne','Guatapé','Gómez Plata','Heliconia','Hispania','Itagüí','Ituango','Jardín','Jericó','La Ceja','La Estrella','La Pintada','La Unión','Liborina','Maceo','Marinilla','Medellín','Montebello','Murindó','Mutatá','Nariño','Nechí','Necoclí','Olaya','Peque','Peñol','Pueblorrico','Puerto Berrío','Puerto Nare','Puerto Triunfo','Remedios','Retiro','Rionegro','Sabanalarga','Sabaneta','Salgar','San Andrés de Cuerquia','San Carlos','San Francisco','San Jerónimo','San José de la Montaña','San Juan de Urabá','San Luis','San Pedro','San Pedro de Urabá','San Pedro de los Milagros','San Rafael','San Roque','San Vicente','Santa Bárbara','Santa Fe de Antioquia','Santa Rosa de Osos','Santo Domingo','Santuario','Segovia','Sonsón','Sopetrán','Tarazá','Tarso','Titiribí','Toledo','Turbo','Támesis','Uramita','Urrao','Valdivia','Valparaíso','Vegachí','Venecia','Vigía del Fuerte','Yalí','Yarumal','Yolombó','Yondó','Zaragoza'],
    'Arauca':['Arauca','Arauquita','Cravo Norte','Fortul','Puerto Rondón','Saravena','Tame'],
    'Atlántico':['Baranoa','Barranquilla','Campo de la Cruz','Candelaria','Galapa','Juan de Acosta','Luruaco','Malambo','Manatí','Palmar de Varela','Piojó','Polonuevo','Ponedera','Puerto Colombia','Repelón','Sabanagrande','Sabanalarga','Santa Lucía','Santo Tomás','Soledad','Suan','Tubará','Usiacurí'],
    'Bogotá D.C.':['Bogotá D.C.'],
    'Bolívar':['Achí','Altos del Rosario','Arenal','Arjona','Arroyohondo','Barranco de Loba','Calamar','Cantagallo','Cartagena de Indias','Cicuco','Clemencia','Córdoba','El Carmen de Bolívar','El Guamo','El Peñón','Hatillo de Loba','Magangué','Mahates','Margarita','María la Baja','Montecristo','Morales','Norosí','Pinillos','Regidor','Río Viejo','San Cristóbal','San Estanislao','San Fernando','San Jacinto','San Jacinto del Cauca','San Juan Nepomuceno','San Martín de Loba','San Pablo','Santa Catalina','Santa Rosa','Santa Rosa del Sur','Simití','Soplaviento','Talaigua Nuevo','Tiquisio','Turbaco','Turbaná','Villanueva','Zambrano'],
    'Boyacá':['Almeida','Aquitania','Arcabuco','Belén','Berbeo','Betéitiva','Boavita','Boyacá','Briceño','Buenavista','Busbanzá','Caldas','Campohermoso','Cerinza','Chinavita','Chiquinquirá','Chiscas','Chita','Chitaraque','Chivatá','Chivor','Chíquiza','Ciénega','Coper','Corrales','Covarachía','Cubará','Cucaita','Cuítiva','Cómbita','Duitama','El Cocuy','El Espino','Firvitoba','Floresta','Gachantivá','Garagoa','Guacamayas','Guateque','Guayatá','Guicán de la Sierra','Gámeza','Iza','Jenesano','Jericó','La Capilla','La Uvita','La Victoria','Labranzagrande','Macanal','Maripí','Miraflores','Mongua','Monguí','Moniquirá','Motavita','Muzo','Nobsa','Nuevo Colón','Oicatá','Otanche','Pachavita','Paipa','Pajarito','Panqueba','Pauna','Paya','Paz de Río','Pesca','Pisba','Puerto Boyacá','Páez','Quípama','Ramiriquí','Rondón','Ráquira','Saboyá','Samacá','San Eduardo','San José de Pare','San Luis de Gaceno','San Mateo','San Miguel de Sema','San Pablo de Borbur','Santa María','Santa Rosa de Viterbo','Santa Sofía','Santana','Sativanorte','Sativasur','Siachoque','Soatá','Socha','Socotá','Sogamoso','Somondoco','Sora','Soracá','Sotaquirá','Susacón','Sutamarchán','Sutatenza','Sáchica','Tasco','Tenza','Tibaná','Tibasosa','Tinjacá','Tipacoque','Toca','Togüí','Tota','Tunja (capital)','Tununguá','Turmequé','Tuta','Tutazá','Tópaga','Ventaquemada','Villa de Leyva','Viracachá','Zetaquira','Úmbita'],
    'Caldas':['Aguadas','Anserma','Aranzazu','Belalcázar','Chinchiná','Filadelfia','La Dorada','La Merced','Manizales','Manzanares','Marmato','Marquetalia','Marulanda','Neira','Norcasia','Palestina','Pensilvania','Pácora','Riosucio','Risaralda','Salamina','Samaná','San José','Supía','Victoria','Villamaría','Viterbo'],
    'Caquetá':['Albania','Belén de los Andaquíes','Cartagena del Chairá','Curillo','El Doncello','El Paujil','Florencia','La Montañita','Milán','Morelia','Puerto Rico','San José del Fragua','San Vicente del Caguán','Solano','Solita','Valparaíso'],
    'Casanare':['Aguazul','Chámeza','Hato Corozal','La Salina','Maní','Monterrey','Nunchía','Orocué','Paz de Ariporo','Pore','Recetor','Sabanalarga','San Luis de Palenque','Sácama','Tauramena','Trinidad','Támara','Villanueva','Yopal'],
    'Cauca':['Almaguer','Argelia','Balboa','Bolívar','Buenos Aires','Cajibío','Caldono','Caloto','Corinto','El Tambo','Florencia','Guachené','Guapi','Inzá','Jambaló','La Sierra','La Vega','López de Micay','Mercaderes','Miranda','Morales','Padilla','Patía','Piamonte','Piendamó','Popayán','Puerto Tejada','Puracé','Páez','Rosas','San Sebastián','Santa Rosa','Santander de Quilichao','Silvia','Sotará','Sucre','Suárez','Timbiquí','Timbío','Toribío','Totoró','Villa Rica'],
    'Cesar':['Aguachica','Agustín Codazzi','Astrea','Becerril','Bosconia','Chimichagua','Chiriguaná','Curumaní','El Copey','El Paso','Gamarra','González','La Gloria','La Jagua de Ibirico','La Paz','Manaure','Pailitas','Pelaya','Pueblo Bello','Río de Oro','San Alberto','San Diego','San Martín','Tamalameque','Valledupar'],
    'Chocó':['Acandí','Alto Baudó','Atrato','Bagadó','Bahía Solano','Bajo Baudó','Bojayá','Carmen del Darién','Condoto','Cértegui','El Cantón de San Pablo','El Carmen de Atrato','El Litoral de San Juan','Istmina','Juradó','Lloró','Medio Atrato','Medio Baudó','Medio San Juan','Nuquí','Nóvita','Quibdó','Riosucio','Río Iró','Río Quito','San José del Palmar','Sipí','Tadó','Unguía','Unión Panamericana'],
    'Cundinamarca':['Agua de Dios','Albán','Anapoima','Anolaima','Apulo','Arbeláez','Beltrán','Bituima','Bogotá','Bojacá','Cabrera','Cachipay','Cajicá','Caparrapí','Carmen de Carupa','Chaguaní','Chipaque','Choachí','Chocontá','Chía','Cogua','Cota','Cucunubá','Cáqueza','El Colegio','El Peñón','El Rosal','Facatativá','Fosca','Funza','Fusagasugá','Fómeque','Fúquene','Gachalá','Gachancipá','Gachetá','Gama','Girardot','Granada','Guachetá','Guaduas','Guasca','Guataquí','Guatavita','Guayabal de Síquima','Guayabetal','Gutiérrez','Jerusalén','Junín','La Calera','La Mesa','La Peña','La Vega','Lenguazaque','Machetá','Madrid','Manta','Mosquera','Nariño','Nilo','Nimaima','Nocaima','Pacho','Paime','Paratebueno','Pasca','Puerto Salgar','Quebradanegra','Quetame','Ricaurte','San Antonio del Tequendama','San Bernardo','San Francisco','San Juan de Rioseco','Sasaima','Sesquilé','Sibaté','Silvania','Simijaca','Soacha','Sopó','Subachoque','Suesca','Supatá','Tabio','Tausa','Tenjo','Tibacuy','Tibirita','Tocaima','Tocancipá','Topaipí','Ubalá','Vergara','Villeta','Viotá','Yacopí','Zipacón','Zipaquirá','Útica'],
    'Córdoba':['Ayapel','Buenavista','Canalete','Cereté','Chimá','Chinú','Ciénaga de Oro','Cotorra','La Apartada','Los Córdobas','Momil','Montelíbano','Montería','Moñitos','Planeta Rica','Pueblo Nuevo','Puerto Escondido','Puerto Libertador','Purísima','Sahagún','San Andrés de Sotavento','San Antero','San Bernardo del Viento','San Carlos','San José de Uré','San Pelayo','Tierralta','Tuchín','Valencia'],
    'Guainía':['Barrancominas','Inírida'],
    'Guaviare':['Calamar','El Retorno','Miraflores','San José del Guaviare'],
    'Huila':['Acevedo','Agrado','Aipe','Algeciras','Altamira','Baraya','Campoalegre','Colombia','Elías','Garzón','Gigante','Guadalupe','Hobo','Isnos','La Argentina','La Plata','Neiva','Nátaga','Oporapa','Paicol','Palermo','Palestina','Pital','Pitalito','Rivera','Saladoblanco','San Agustín','Santa María','Suaza','Tarqui','Tello','Teruel','Tesalia','Timaná','Villavieja','Yaguará','Íquira'],
    'La Guajira':['Albania','Barrancas','Dibulla','Distracción','El Molino','Fonseca','Hatonuevo','La Jagua del Pilar','Maicao','Manaure','Riohacha','San Juan del Cesar','Uribia','Urumita'],
    'Magdalena':['Algarrobo','Aracataca','Ariguaní','Cerro de San Antonio','Chibolo','Ciénaga','Concordia','El Banco','El Piñón','El Retén','Fundación','Guamal','Nueva Granada','Pedraza','Pijiño del Carmen','Pivijay','Plato','Puebloviejo','Remolino','Sabanas de San Ángel','Salamina','San Sebastián de Buenavista','San Zenón','Santa Ana','Santa Bárbara de Pinto','Santa Marta','Sitionuevo','Tenerife','Zapayán','Zona Bananera'],
    'Meta':['Acacías','Barranca de Upía','Cabuyaro','Castilla la Nueva','Cubarral','Cumaral','El Calvario','El Castillo','El Dorado','Fuente de Oro','Granada','Guamal','La Macarena','La Uribe','Lejanías','Mapiripán','Mesetas','Puerto Concordia','Puerto Gaitán','Puerto Lleras','Puerto López','Puerto Rico','Restrepo','San Carlos de Guaroa','San Juan de Arama','San Juanito','San Martín','Villavicencio','Vista Hermosa'],
    'Nariño':['Albán','Aldana','Ancuya','Arboleda','Barbacoas','Belén','Buesaco','Chachagüí','Colón','Consacá','Contadero','Cuaspud','Cumbal','Cumbitara','Córdoba','El Charco','El Peñol','El Rosario','El Tablón de Gómez','El Tambo','Francisco Pizarro','Funes','Guachucal','Guaitarilla','Gualmatán','Iles','Imués','Ipiales','La Cruz','La Florida','La Llanada','La Tola','La Unión','Leiva','Linares','Los Andes','Magüí Payán','Mallama','Mosquera','Nariño','Olaya Herrera','Ospina','Pasto','Policarpa','Potosí','Providencia','Puerres','Pupiales','Ricaurte','Roberto Payán','Samaniego','San Bernardo','San Lorenzo','San Pablo','San Pedro de Cartago','Sandoná','Santa Bárbara','Santa Cruz','Sapuyes','Taminango','Tangua','Tumaco','Túquerres','Yacuanquer'],
    'Norte de Santander':['Arboledas','Bochalema','Bucarasica','Convención','Cucutilla','Cáchira','Cúcuta','Durania','El Carmen','El Tarra','El Zulia','Gramalote','Hacarí','Herrán','La Esperanza','La Playa de Belén','Los Patios','Lourdes','Mutiscua','Ocaña','Pamplona','Pamplonita','Puerto Santander','Ragonvalia','Salazar de Las Palmas','San Calixto','San Cayetano','Santiago','Sardinata','Teorama','Tibú','Toledo','Villa Caro','Villa del Rosario','Ábrego'],
    'Putumayo':['Colón','Mocoa','Orito','Puerto Asís','Puerto Caicedo','Puerto Guzmán','Puerto Leguízamo','San Francisco','San Miguel','Santiago','Sibundoy','Valle del Guamuez','Villagarzón'],
    'Quindío':['Armenia','Buenavista','Calarcá','Circasia','Córdoba','Filandia','Génova','La Tebaida','Montenegro','Pijao','Quimbaya','Salento'],
    'Risaralda':['Apía','Balboa','Belén de Umbría','Dosquebradas','Guática','La Celia','La Virginia','Marsella','Mistrató','Pereira','Pueblo Rico','Quinchía','Santa Rosa de Cabal','Santuario'],
    'San Andrés, Providencia y Santa Catalina':['Providencia y Santa Catalina','San Andrés'],
    'Santander':['Aguada','Albania','Aratoca','Barbosa','Barichara','Barrancabermeja','Betulia','Bolívar','Bucaramanga','Cabrera','California','Capitanejo','Carcasí','Cepitá','Cerrito','Charalá','Charta','Chipatá','Cimitarra','Concepción','Confines','Contratación','Coromoro','Curití','El Carmen de Chucurí','El Guacamayo','El Peñón','El Playón','Encino','Enciso','Floridablanca','Florián','Galán','Gambita','Girón','Guaca','Guadalupe','Guapotá','Guavatá','Güepsa','Hato','Jesús María','Jordán','La Belleza','La Paz','Landázuri','Lebrija','Los Santos','Macaravita','Matanza','Mogotes','Málaga','Ocamonte','Oiba','Onzaga','Palmar','Palmas del Socorro','Pinchote','Puente Nacional','Puerto Wilches','Páramo','Rionegro','Sabana de Torres','San Andrés','San Benito','San Gil','San Joaquín','San José de Miranda','San Miguel','San Vicente de Chucurí','Santa Bárbara','Santa Helena del Opón','Simacota','Socorro','Suaita','Sucre','Suratá','Tona','Valle de San José','Villanueva','Vélez','Zapatoca'],
    'Sucre':['Buenavista','Caimito','Chalán','Colosó','Corozal','Coveñas','El Roble','Galeras','Guaranda','La Unión','Los Palmitos','Majagual','Morroa','Ovejas','Palmito','Sampués','San Benito Abad','San Juan de Betulia','San Marcos','San Onofre','San Pedro','Sincelejo','Sincé','Sucre','Toluviejo','Tolú'],
    'Tolima':['Alpujarra','Alvarado','Ambalema','Anzoátegui','Armero Guayabal','Ataco','Cajamarca','Carmen de Apicalá','Casabianca','Chaparral','Coello','Coyaima','Cunday','Dolores','Espinal','Falan','Flandes','Fresno','Guamo','Herveo','Honda','Ibagué','Icononzo','Lérida','Líbano','Mariquita','Melgar','Murillo','Natagaima','Ortega','Palocabildo','Piedras','Planadas','Prado','Purificación','Rioblanco','Roncesvalles','Rovira','Saldaña','San Antonio','San Luis','Santa Isabel','Suárez','Valle de San Juan','Venadillo','Villahermosa','Villarrica'],
    'Valle del Cauca':['Alcalá','Andalucía','Ansermanuevo','Argelia','Bolívar','Buenaventura','Buga','Bugalagrande','Caicedonia','Cali','Calima‑Darien','Candelaria','Cartago','Dagua','El Cairo','El Cerrito','El Dovio','El Águila','Florida','Ginebra','Guacarí','Jamundí','La Cumbre','La Unión','La Victoria','Obando','Palmira','Pradera','Restrepo','Riofrío','Roldanillo','San Pedro','Sevilla','Toro','Trujillo','Tuluá','Ulloa','Versalles','Vijes','Yotoco','Yumbo','Zarzal'],
    'Vaupés':['Carurú','Mitú','Taraira'],
    'Vichada':['Cumaribo','La Primavera','Puerto Carreño','Santa Rosalía']
  };
  var lista = munis[depto] || [];
  selCiudad.innerHTML = '<option value="">Selecciona municipio...</option>' +
    lista.map(m => '<option value="' + m + '">' + m + '</option>').join('');
}

// ── Pantalla de inicio ──────────────────────────────────────
function selTipoPedido(tipo) {
  S.tipoPedido = tipo;
  document.querySelectorAll('.tipo-pedido-card').forEach(c => c.classList.remove('sel'));
  event.currentTarget.classList.add('sel');
}

function selCanal(canal) {
  S.canal = canal;
  document.querySelectorAll('.canal-card').forEach(c => c.classList.remove('sel'));
  $('canal-' + canal).classList.add('sel');
}

function selTipoCliente(tipo) {
  S.tipoCliente = tipo;
  $('campos-personal').style.display = tipo === 'Personal' ? 'block' : 'none';
  $('campos-empresa').style.display  = tipo === 'Empresa'  ? 'block' : 'none';
  $('btn-personal').className = tipo === 'Personal' ? 'btn btn-primary' : 'btn btn-secondary';
  $('btn-empresa').className  = tipo === 'Empresa'  ? 'btn btn-primary' : 'btn btn-secondary';
  $('btn-personal').style.flex = $('btn-empresa').style.flex = '1';
  $('btn-personal').style.fontSize = $('btn-empresa').style.fontSize = '.8rem';
  if ($('tipoDocInput')) $('tipoDocInput').value = tipo === 'Empresa' ? 'NIT' : 'CC';
}

function irDesdeInicio() {
  if (!S.tipoPedido) { alert('Selecciona el tipo de pedido.'); return; }
  if (!S.canal) { alert('Selecciona desde dónde haces tu pedido.'); return; }
  S.flujo = FLUJOS[S.tipoPedido];
  S.flujoIdx = 0;
  construirProgress();
  mostrarSeccion(S.flujo[0]);
}

// ── Navegación ──────────────────────────────────────────────
function construirProgress() {
  var labels = PASOS_LABELS[S.tipoPedido];
  $('progressSteps').innerHTML = labels.map((l, i) =>
    '<div class="ps' + (i===0?' active':'') + '" data-idx="' + i + '">' +
    '<div class="ps-dot">' + (i+1) + '</div>' +
    '<div class="ps-label">' + l + '</div></div>'
  ).join('');
}

function actualizarProgress() {
  document.querySelectorAll('.ps').forEach((el, i) => {
    el.classList.remove('active','done');
    if (i === S.flujoIdx) el.classList.add('active');
    if (i < S.flujoIdx)  el.classList.add('done');
  });
}

function mostrarSeccion(secId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $(secId).classList.add('active');
  $('progressWrap').style.display = 'block';
  $('totalBar').style.display     = 'flex';
  $('btnAtras').style.display     = S.flujoIdx > 0 ? 'flex' : 'none';
  var esAcomp  = secId === 'sec-acompanante';
  var esUltimo = S.flujoIdx === S.flujo.length - 1;
  $('btnSkip').style.display  = esAcomp ? 'inline-block' : 'none';
  $('btnSig').textContent     = esUltimo ? '✓ Confirmar y Guardar' : 'Siguiente →';
  if (secId === 'sec-4-bono')              renderBonos();
  if (secId === 'sec-productos')           renderProductos();
  if (secId === 'sec-acompanante')         renderAcompanantes('Velas');
  if (secId === 'sec-envio')               renderEnvios();
  if (secId === 'sec-productos-campana')   cargarProductosCampanaForm();
  if (secId === 'sec-productos-evento')    cargarProductosEventoForm();
  if (secId === 'sec-productos-temporada') cargarProductosTemporadaForm();
  if (secId === 'sec-orden')               renderOrden();
  actualizarProgress();
  actualizarTotal();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function irSiguiente(skip) {
  var secActual = S.flujo[S.flujoIdx];
  if (secActual === 'sec-orden') { confirmarPedido(); return; }
  if (!skip && !validar(secActual)) return;
  if (secActual === 'sec-4-bono' && S.sinBono)
    S.empaque = { nombre:'Sin empaque', precio:0, es_virtual:false };
  S.flujoIdx++;
  mostrarSeccion(S.flujo[S.flujoIdx]);
}

function irAtras() {
  if (S.flujoIdx === 0) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('sec-0').classList.add('active');
    $('progressWrap').style.display = 'none';
    $('totalBar').style.display     = 'none';
    return;
  }
  S.flujoIdx--;
  mostrarSeccion(S.flujo[S.flujoIdx]);
}

// ── Validaciones ────────────────────────────────────────────
function validar(secId) {
  if (secId === 'sec-1') {
    if (S.tipoCliente === 'Personal') {
      if (!$('c_nombres').value.trim())          { alert('Ingresa los nombres.'); return false; }
      if (!$('c_apellidos').value.trim())        { alert('Ingresa los apellidos.'); return false; }
      if (!$('c_celular').value.trim())          { alert('Ingresa el celular.'); return false; }
      if (!$('c_correo_contacto').value.trim())  { alert('Ingresa el correo de contacto.'); return false; }
      if (!$('c_correo_factura').value.trim())   { alert('Ingresa el correo para factura.'); return false; }
      if (!$('c_ciudad').value.trim())           { alert('Ingresa la ciudad.'); return false; }
      S.comprador = { tipo:'Personal', tipodoc:$('tipoDocInput').value, cedula:$('docInput').value.trim(),
        nombres:$('c_nombres').value.trim(), apellidos:$('c_apellidos').value.trim(),
        celular:$('c_celular').value.trim(), correo:$('c_correo_contacto').value.trim(),
        correoFactura:$('c_correo_factura').value.trim(), ciudad:$('c_ciudad').value.trim(),
        departamento:$('c_departamento').value.trim(), direccion:$('c_direccion').value.trim(), esNuevo:S.esNuevo };
    } else {
      if (!$('e_nit').value.trim())              { alert('Ingresa el NIT.'); return false; }
      if (!$('e_razon').value.trim())            { alert('Ingresa la razón social.'); return false; }
      if (!$('e_correo_factura').value.trim())   { alert('Ingresa el correo de factura.'); return false; }
      if (!$('e_contacto').value.trim())         { alert('Ingresa el nombre del contacto.'); return false; }
      if (!$('e_telefono').value.trim())         { alert('Ingresa el teléfono.'); return false; }
      if (!$('e_correo_contacto').value.trim())  { alert('Ingresa el correo de contacto.'); return false; }
      if (!$('e_ciudad').value.trim())           { alert('Ingresa la ciudad.'); return false; }
      S.comprador = { tipo:'Empresa', nit:$('e_nit').value.trim(), cedula:$('e_nit').value.trim(),
        razonSocial:$('e_razon').value.trim(), contacto:$('e_contacto').value.trim(),
        celular:$('e_telefono').value.trim(), correo:$('e_correo_contacto').value.trim(),
        correoFactura:$('e_correo_factura').value.trim(), ciudad:$('e_ciudad').value.trim(),
        departamento:$('e_departamento').value.trim(), esNuevo:S.esNuevo };
    }
    return true;
  }
  if (secId === 'sec-2') {
    if (!$('mismoComprador').checked) {
      if (!$('d_nombres').value.trim())    { alert('Ingresa los nombres del destinatario.'); return false; }
      if (!$('d_celular').value.trim())    { alert('Ingresa el celular del destinatario.'); return false; }
      if (!$('d_departamento').value)      { alert('Selecciona el departamento.'); return false; }
      if (!$('d_ciudad').value)            { alert('Selecciona el municipio.'); return false; }
      if (!$('d_direccion').value.trim())  { alert('Ingresa la dirección de entrega.'); return false; }
    }
    S.destinatario = $('mismoComprador').checked ? { ...S.comprador, esMismo:true } : {
      nombres:$('d_nombres').value.trim(), apellidos:$('d_apellidos').value.trim(),
      celular:$('d_celular').value.trim(), ciudad:$('d_ciudad').value,
      municipio:$('d_ciudad').value, departamento:$('d_departamento').value,
      direccion:$('d_direccion').value.trim(), referencia:$('d_referencia').value.trim()
    };
    return true;
  }
  if (secId === 'sec-3-pesame') {
    if (!$('p_fallecido').value.trim())     { alert('Ingresa el nombre del fallecido.'); return false; }
    if (!$('p_firma_pesame').value.trim())  { alert('Ingresa quién envía el bono.'); return false; }
    if (!$('p_dirigido').value.trim())      { alert('Indica para quién va dirigido.'); return false; }
    S.fallecido     = $('p_fallecido').value.trim();
    S.dirigido      = $('p_dirigido').value.trim();
    S.quienAtiende  = '';
    S.mensaje       = $('p_mensaje_pesame').value.trim();
    S.firma         = $('p_firma_pesame').value.trim();
    S.notas         = S.mensaje;
    return true;
  }
  if (secId === 'sec-3-toda') {
    if (!$('t_dirigido').value.trim()) { alert('Indica para quién va dirigido.'); return false; }
    if (!$('t_firma').value.trim())    { alert('Ingresa quién envía el bono.'); return false; }
    S.dirigido     = $('t_dirigido').value.trim();
    S.quienAtiende = '';
    S.mensaje      = $('t_mensaje').value.trim();
    S.firma        = $('t_firma').value.trim();
    S.notas        = S.mensaje;
    return true;
  }
  if (secId === 'sec-3-producto') {
    if (!$('pr_dirigido').value.trim()) { alert('Indica para quién va el pedido.'); return false; }
    S.dirigido     = $('pr_dirigido').value.trim();
    S.quienAtiende = $('pr_quien').value.trim();
    S.mensaje      = $('pr_mensaje').value.trim();
    S.notas        = $('pr_notas').value.trim();
    return true;
  }
  if (secId === 'sec-3-donacion') {
    if (!$('p_campana').value) { alert('Selecciona la campaña a la que va tu donación.'); return false; }
    var tipo = S.campana_tipo || 'dinero';
    var val  = parseInt($('p_valor_donacion').value) || 0;
    if ((tipo === 'dinero' || tipo === 'ambos') && val <= 0) { alert('Ingresa el valor de la donación.'); return false; }
    S.valorDonacion = val;
    S.campana_id    = $('p_campana').value;
    S.campana       = $('p_campana').options[$('p_campana').selectedIndex].text;
    S.notas         = $('p_notas_donacion').value.trim();
    S.destinatario  = { ...S.comprador };
    S.envio         = { l:'Donación digital', p:0 };
    return true;
  }
  if (secId === 'sec-4-bono') {
    if (!S.sinBono && (!S.bonos || !S.bonos.length)) { alert('Selecciona al menos una presentación.'); return false; }
    var tienePlegable = S.bonos && S.bonos.some(b => !b.es_virtual);
    if (tienePlegable && !S.empaque) { alert('Selecciona el tipo de empaque.'); return false; }
    return true;
  }
  if (secId === 'sec-productos') {
    if (!S.productosElegidos.length) { alert('Selecciona al menos un producto.'); return false; }
    return true;
  }
  if (secId === 'sec-envio') {
    if (!S.envio) { alert('Selecciona el método de envío.'); return false; }
    return true;
  }
  if (secId === 'sec-orden') {
    // Validar autorización de datos
    var cbDatos = $('cb-autorizo-datos');
    if (cbDatos && !cbDatos.checked) { alert('Debes autorizar el tratamiento de tus datos personales para continuar.'); return false; }
    return true;
  }
  return true;
}

// ── Buscar tercero ──────────────────────────────────────────
async function buscarTercero() {
  var doc    = $('docInput').value.trim();
  var tipodoc = $('tipoDocInput').value;
  if (!doc) { alert('Ingresa el número de documento.'); return; }
  $('searchTxt').textContent = '...';
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/terceros?numerodoc=eq.' + encodeURIComponent(doc) + '&tipodoc=eq.' + tipodoc + '&limit=1', { headers: sbH() });
    var rows = await r.json();
    if (rows.length > 0) {
      var t = rows[0];
      S.esNuevo = false;
      if (S.tipoCliente === 'Personal') {
        $('c_nombres').value         = t.nombres || '';
        $('c_apellidos').value       = t.apellidos || '';
        $('c_celular').value         = t.telefono1 || '';
        $('c_correo_contacto').value = t.correo_principal || '';
        $('c_correo_factura').value  = t.correoelectronica || t.correo_principal || '';
        $('c_ciudad').value          = t.ciudad || '';
        $('c_departamento').value    = t.departamento || '';
        $('c_direccion').value       = t.direccion || '';
      } else {
        $('e_nit').value             = t.nitempresa || t.numerodoc || '';
        $('e_razon').value           = t.razonsocial || '';
        $('e_correo_factura').value  = t.correoelectronica || '';
        $('e_contacto').value        = t.contactoempresa || '';
        $('e_telefono').value        = t.telefono1 || '';
        $('e_correo_contacto').value = t.correo_principal || '';
        $('e_ciudad').value          = t.ciudad || '';
        $('e_departamento').value    = t.departamento || '';
      }
      mostrarStatus('found', '✓', '¡Encontrado! Datos cargados. Puedes corregir si es necesario.');
    } else {
      S.esNuevo = true;
      mostrarStatus('notfound', '⚠', 'No encontramos tus datos. Por favor complétalos.');
    }
  } catch(e) {
    S.esNuevo = true;
    mostrarStatus('notfound', '⚠', 'Sin conexión. Completa los datos manualmente.');
  }
  $('searchTxt').textContent = 'Buscar';
}

function mostrarStatus(tipo, icon, msg) {
  var el = $('searchStatus');
  el.className = 'status ' + tipo;
  $('statusIcon').textContent = icon;
  $('statusMsg').textContent  = msg;
}

function toggleMismo(cb) {
  $('campos-dest').style.display = cb.checked ? 'none' : 'block';
}

// ── Tarjetas de color ───────────────────────────────────────
function selTarjeta(card, val, scope) {
  S.tarjeta = val;
  var contenedor = scope === 'pesame' ? 'sec-3-pesame' : 'sec-3-toda';
  document.querySelectorAll('#' + contenedor + ' .tarjeta-card').forEach(c => c.classList.remove('sel'));
  card.classList.add('sel');
}

// ── Render bonos ────────────────────────────────────────────
function renderBonos() {
  var lista = CATALOGO.bonos_base || [];
  if (!lista.length) { $('bonoGrid').innerHTML = '<p style="color:var(--ink-lt);padding:20px">Cargando...</p>'; return; }
  var html = lista.map(function(p, i) {
    var sel = S.bonos && S.bonos.some(b => b.id === p.id) ? ' sel' : '';
    var img = (p.imagen_url || p.imagen_url_shopify) ? '<img src="' + (p.imagen_url || p.imagen_url_shopify) + '" onerror="this.style.display=\'none\'">' : '';
    return '<div class="prod-card' + sel + '" onclick="selBono(' + i + ')">' + img +
      '<div class="prod-info"><div class="prod-nombre">' + p.nombre + '</div>' +
      '<div class="prod-precio">' + fmt(p.precio) + '</div></div></div>';
  }).join('');
  $('bonoGrid').innerHTML = html;
}

function selBono(idx) {
  var lista = CATALOGO.bonos_base || [];
  var p = lista[idx];
  if (!S.bonos) S.bonos = [];
  S.sinBono = false;
  var existeIdx = S.bonos.findIndex(b => b.id === p.id);
  if (existeIdx >= 0) S.bonos.splice(existeIdx, 1);
  else S.bonos.push(p);
  S.bono = S.bonos.length > 0 ? S.bonos[0] : null;
  renderBonos();
  if (S.bonos.length > 0) {
    $('bono-sel-nombre').textContent = S.bonos.map(b => b.nombre).join(', ');
    $('bono-sel-precio').textContent = fmt(S.bonos.reduce((s, b) => s + b.precio, 0));
    $('bono-sel-resumen').style.display = 'block';
  } else {
    $('bono-sel-resumen').style.display = 'none';
  }
  var todoVirtual = S.bonos.length > 0 && S.bonos.every(b => b.es_virtual);
  var tieneVirtual = S.bonos.some(b => b.es_virtual);
  if ($('aviso-virtual')) $('aviso-virtual').style.display = tieneVirtual ? 'block' : 'none';
  var cardEmpaque = $('card-empaque');
  if (cardEmpaque) {
    if (S.bonos.length > 0 && !todoVirtual) { cardEmpaque.style.display = 'block'; renderEmpaques(); }
    else {
      cardEmpaque.style.display = 'none';
      if (todoVirtual) S.empaque = { id:'virtual', nombre:'Virtual', precio:-4000, es_virtual:true };
    }
  }
  actualizarTotal();
}

// ── Render empaques ─────────────────────────────────────────
function renderEmpaques() {
  var lista = CATALOGO.empaques || [];
  if (!lista.length) { $('empaqueGrid').innerHTML = '<p style="color:var(--ink-lt);padding:20px">Cargando...</p>'; return; }
  $('empaqueGrid').innerHTML = lista.map(function(p, i) {
    var sel = S.empaque && S.empaque.id === p.id ? ' sel' : '';
    var img = (p.imagen_url || p.imagen_url_shopify) ? '<img src="' + (p.imagen_url || p.imagen_url_shopify) + '" onerror="this.style.display=\'none\'">' : '';
    var precioLabel = p.precio === 0 ? 'Sin costo adicional' : p.precio > 0 ? '+ ' + fmt(p.precio) : '- ' + fmt(Math.abs(p.precio));
    return '<div class="prod-card' + sel + '" onclick="selEmpaque(' + i + ')">' + img +
      '<div class="prod-info"><div class="prod-nombre">' + p.nombre + '</div>' +
      '<div class="prod-precio">' + precioLabel + '</div></div></div>';
  }).join('');
}

function selEmpaque(idx) {
  S.empaque = CATALOGO.empaques[idx];
  renderEmpaques();
  $('emp-sel-nombre').textContent = S.empaque.nombre;
  $('emp-sel-precio').textContent = S.empaque.precio === 0 ? 'Sin costo adicional' : fmt(S.empaque.precio);
  $('emp-sel-resumen').style.display = 'block';
  actualizarTotal();
}

// ── Render productos ────────────────────────────────────────
function renderProductos(cat) {
  var lista = S.tipoPedido === 'empresarial' ? CATALOGO.empresarial : CATALOGO.productos;
  var cats = [...new Set(lista.map(p => p.subcategoria).filter(Boolean))];
  var catActiva = cat || cats[0] || '';
  $('prodTabs').innerHTML = cats.map(c =>
    '<button class="cat-tab' + (c===catActiva?' active':'') + '" onclick="renderProductos(\'' + c + '\')">' + c + '</button>'
  ).join('');
  var filtrados = catActiva ? lista.filter(p => p.subcategoria === catActiva) : lista;
  $('prodGrid').innerHTML = filtrados.map(function(p) {
    var sel = S.productosElegidos.some(x => x.id === p.id);
    var qty = (S.productosElegidos.find(x => x.id === p.id) || {}).qty || 1;
    var img = (p.imagen_url || p.imagen_url_shopify) ? '<img src="' + (p.imagen_url || p.imagen_url_shopify) + '" onerror="this.style.display=\'none\'">' : '';
    var qtyHtml = sel ? '<div style="display:flex;align-items:center;gap:6px;margin-top:8px"><label style="font-size:.7rem;color:var(--ink-lt);text-transform:uppercase;letter-spacing:.05em">Cant.</label><input type="number" value="' + qty + '" min="1" max="9999" onclick="event.stopPropagation()" onchange="event.stopPropagation();editarQtyPorId(' + p.id + ',this.value)" oninput="event.stopPropagation()" style="width:60px;padding:4px 8px;border:1.5px solid var(--pink);border-radius:6px;font-size:.85rem;font-weight:600;color:var(--ink);text-align:center"></div>' : '';
    return '<div class="prod-card' + (sel?' sel':'') + '" onclick="selProductoPorId(' + p.id + ')">' + img +
      '<div class="prod-info"><div class="prod-nombre">' + p.nombre + '</div><div class="prod-precio">' + fmt(p.precio) + '</div>' + qtyHtml + '</div></div>';
  }).join('');
  actualizarResumenProductos();
}

function selProductoPorId(id) {
  var lista = S.tipoPedido === 'empresarial' ? CATALOGO.empresarial : CATALOGO.productos;
  var p = lista.find(x => x.id === id);
  if (!p) return;
  var idx = S.productosElegidos.findIndex(x => x.id === id);
  if (idx >= 0) S.productosElegidos.splice(idx, 1);
  else S.productosElegidos.push({ ...p, qty:1 });
  var catActiva = (document.querySelector('.cat-tab.active') || {}).textContent || '';
  renderProductos(catActiva);
  actualizarTotal();
}

function editarQtyPorId(id, valor) {
  var qty = Math.max(1, parseInt(valor) || 1);
  var idx = S.productosElegidos.findIndex(x => x.id === id);
  if (idx >= 0) S.productosElegidos[idx].qty = qty;
  actualizarTotal();
  actualizarResumenProductos();
}

function actualizarResumenProductos() {
  var txt = $('prod-sel-txt');
  if (S.productosElegidos.length === 0) {
    txt.textContent = 'No has seleccionado ningún producto todavía.';
    $('prod-sel-resumen').style.background = 'var(--cream)';
  } else {
    txt.innerHTML = '✓ <strong>' + S.productosElegidos.length + ' producto(s):</strong> ' +
      S.productosElegidos.map(p => p.nombre).join(', ') + ' — <strong>' +
      fmt(S.productosElegidos.reduce((s, p) => s + p.precio, 0)) + '</strong>';
    $('prod-sel-resumen').style.background = 'var(--pink-lt)';
  }
}

// ── Render acompañantes ─────────────────────────────────────
function renderAcompanantes(cat) {
  var lista = CATALOGO.acompanantes || [];
  var cats = [...new Set(lista.map(p => p.subcategoria).filter(Boolean))];
  var catActiva = cat || cats[0] || '';
  $('acompTabs').innerHTML = cats.map(c =>
    '<button class="cat-tab' + (c===catActiva?' active':'') + '" onclick="renderAcompanantes(\'' + c + '\')">' + c + '</button>'
  ).join('');
  var filtrados = catActiva ? lista.filter(p => p.subcategoria === catActiva) : lista;
  $('acompGrid').innerHTML = filtrados.map(function(p) {
    var sel = S.acompanantes.some(x => x.id === p.id);
    var idx = lista.indexOf(p);
    var img = (p.imagen_url || p.imagen_url_shopify) ? '<img src="' + (p.imagen_url || p.imagen_url_shopify) + '" onerror="this.style.display=\'none\'">' : '';
    return '<div class="prod-card' + (sel?' sel':'') + '" onclick="selAcompanante(' + idx + ')">' + img +
      '<div class="prod-info"><div class="prod-nombre">' + p.nombre + '</div><div class="prod-precio">+ ' + fmt(p.precio) + '</div></div></div>';
  }).join('');
}

function selAcompanante(idx) {
  var lista = CATALOGO.acompanantes || [];
  var p = lista[idx];
  var existeIdx = S.acompanantes.findIndex(x => x.id === p.id);
  if (existeIdx >= 0) S.acompanantes.splice(existeIdx, 1);
  else S.acompanantes.push(p);
  var catActiva = (document.querySelector('#acompTabs .cat-tab.active') || {}).textContent || '';
  renderAcompanantes(catActiva);
  if (S.acompanantes.length > 0) {
    $('acomp-sel-nombres').textContent = S.acompanantes.map(a => a.nombre).join(', ');
    $('acomp-sel-total').textContent   = fmt(S.acompanantes.reduce((s, a) => s + a.precio, 0));
    $('acomp-sel-resumen').style.display = 'block';
  } else {
    $('acomp-sel-resumen').style.display = 'none';
  }
  actualizarTotal();
}

// ── Campaña / Evento / Temporada en flujo propio ────────────
async function cargarProductosCampanaForm() {
  var cont = $('sec-prod-campana-content');
  if (!cont) return;
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/campanas?activo=eq.true&order=nombre.asc', { headers: sbH() });
    var campanas = await r.json();
    if (!campanas.length) { cont.innerHTML = '<div style="color:var(--ink-lt);padding:16px">No hay campañas activas.</div>'; return; }
    cont.innerHTML = campanas.map(function(c) {
      var safe = c.nombre.replace(/'/g, '&#39;');
      var desc = c.descripcion ? '<div style="font-size:.8rem;color:var(--ink-lt);margin-top:4px">' + c.descripcion + '</div>' : '';
      return '<div style="border:2px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;cursor:pointer;background:var(--white)" onclick="selCampanaForm(' + c.id + ',\'' + safe + '\',this)">' +
        '<div style="font-weight:600;font-size:.95rem">' + c.nombre + '</div>' + desc + '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

function selCampanaForm(id, nombre, el) {
  S.campana_id = id;
  S.campana    = nombre;
  document.querySelectorAll('#sec-prod-campana-content > div').forEach(d => d.style.borderColor = 'var(--border)');
  el.style.borderColor = 'var(--pink)';
}

async function cargarProductosEventoForm() {
  var cont = $('sec-prod-evento-content');
  if (!cont) return;
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/eventos?activo=eq.true&order=nombre.asc', { headers: sbH() });
    var eventos = await r.json();
    if (!eventos.length) { cont.innerHTML = '<div style="color:var(--ink-lt);padding:16px">No hay eventos activos.</div>'; return; }
    cont.innerHTML = eventos.map(function(e) {
      var safe  = e.nombre.replace(/'/g, '&#39;');
      var desc  = e.descripcion ? '<div style="font-size:.8rem;color:var(--ink-lt);margin-top:4px">' + e.descripcion + '</div>' : '';
      var fecha = e.fecha ? '<div style="font-size:.78rem;color:var(--pink);margin-top:4px">📅 ' + e.fecha + '</div>' : '';
      return '<div style="border:2px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px;cursor:pointer;background:var(--white)" onclick="selEventoForm(' + e.id + ',\'' + safe + '\',this)">' +
        '<div style="font-weight:600;font-size:.95rem">' + e.nombre + '</div>' + desc + fecha + '</div>';
    }).join('');
  } catch(e) { console.error(e); }
}

function selEventoForm(id, nombre, el) {
  S.evento_id = id;
  S.evento    = nombre;
  document.querySelectorAll('#sec-prod-evento-content > div').forEach(d => d.style.borderColor = 'var(--border)');
  el.style.borderColor = 'var(--pink)';
}

async function cargarProductosTemporadaForm() {
  var cont = $('sec-prod-temporada-content');
  if (!cont) return;
  var t = window._temporadaActiva;
  if (!t) return;
  try {
    var r = await fetch(SUPABASE_URL + '/rest/v1/temporada_productos?temporada_id=eq.' + t.id + '&activo=eq.true', { headers: sbH() });
    var prods = await r.json();
    if (!prods.length) { cont.innerHTML = '<div style="color:var(--ink-lt);padding:16px">No hay productos en esta temporada.</div>'; return; }
    cont.innerHTML = '<div class="prod-grid">' + prods.map(function(p) {
      var safe = p.nombre.replace(/'/g, '&#39;');
      var img  = p.imagen_url ? '<img src="' + p.imagen_url + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px" onerror="this.style.display=\'none\'">' : '';
      return '<div class="prod-card" onclick="toggleProdTemporadaForm(' + p.id + ',\'' + safe + '\',' + p.precio + ',this)">' +
        img + '<div style="font-weight:600;font-size:.83rem">' + p.nombre + '</div>' +
        '<div style="color:var(--pink);font-weight:700;margin-top:4px">' + fmt(p.precio) + '</div></div>';
    }).join('') + '</div>';
  } catch(e) { console.error(e); }
}

function toggleProdTemporadaForm(id, nombre, precio, el) {
  var idx = S.productosElegidos.findIndex(p => p.id === id);
  if (idx >= 0) { S.productosElegidos.splice(idx, 1); el.classList.remove('sel'); }
  else          { S.productosElegidos.push({ id, nombre, precio, cantidad:1 }); el.classList.add('sel'); }
  actualizarTotal();
}

// ── Total ───────────────────────────────────────────────────
function getTotal() {
  if (S.tipoPedido === 'donacion') {
    var t = S.valorDonacion || 0;
    if (S.productosDonacion) t += S.productosDonacion.reduce((s, p) => s + (p.precio * (p.qty||1)), 0);
    return Math.max(0, t);
  }
  var total = 0;
  if (S.bonos && S.bonos.length) total += S.bonos.reduce((s, b) => s + b.precio, 0);
  else if (S.bono) total += S.bono.precio;
  if (S.empaque && S.empaque.precio) total += S.empaque.precio;
  total += S.acompanantes.reduce((s, a) => s + a.precio, 0);
  total += S.productosElegidos.reduce((s, p) => s + (p.precio * (p.qty||1)), 0);
  if (S.envio) total += S.envio.p;
  return Math.max(0, total);
}

function actualizarTotal() {
  $('totalAmount').textContent = fmt(getTotal());
}

// ── Render orden final ──────────────────────────────────────
function renderOrden() {
  var total = getTotal();
  var c = S.comprador, d = S.destinatario;
  var items = [];
  if (S.bonos && S.bonos.length) S.bonos.forEach(b => items.push({ desc:b.nombre, precio:b.precio }));
  else if (S.bono) items.push({ desc:S.bono.nombre, precio:S.bono.precio });
  if (S.empaque && S.empaque.precio) items.push({ desc:'Empaque: ' + S.empaque.nombre, precio:S.empaque.precio });
  S.acompanantes.forEach(a => items.push({ desc:'Acompañante: ' + a.nombre, precio:a.precio }));
  S.productosElegidos.forEach(p => items.push({ desc:p.nombre + (p.qty>1?' x'+p.qty:''), precio:p.precio*(p.qty||1) }));
  if (S.tipoPedido === 'donacion') items.push({ desc:'Donación', precio:S.valorDonacion });
  if (S.envio && S.envio.p > 0) items.push({ desc:'Envío', precio:S.envio.p });

  $('ordenPrint').innerHTML =
    '<div class="orden-header">' +
    '<img src="https://santiagocorazon.org/cdn/shop/files/logo_2x_bbc620f1-38c8-4061-b2f2-1f87b357546e.png?v=1614736127&width=200" class="orden-logo" alt="Santiago Corazón" onerror="this.style.display=\'none\'">' +
    '<div class="orden-num"><strong>' + orderNum + '</strong>' + today() + '<br><span style="font-size:.68rem;color:var(--pink);font-weight:600">ORDEN DE DESPACHO</span></div></div>' +
    '<div class="orden-grid">' +
    '<div class="orden-block"><h4>📦 Comprador / Pagador</h4><p><strong>' +
    (c.tipo==='Empresa' ? (c.razonSocial||'') : ((c.nombres||'')+' '+(c.apellidos||'')).trim()) +
    '</strong><br>' + (c.tipo==='Empresa' ? 'NIT: '+(c.nit||'—') : 'Doc: '+(c.cedula||'—')) +
    '<br>Tel: ' + (c.celular||'—') + '<br>Email: ' + (c.correo||'—') + '</p></div>' +
    '<div class="orden-block"><h4>🚚 Destinatario y entrega</h4><p><strong>' +
    ((d.nombres||'')+' '+(d.apellidos||'')).trim() + '</strong><br>Tel: ' + (d.celular||'—') +
    '<br>Ciudad: ' + (d.ciudad||'—') + '<br>Dir: ' + (d.direccion||'—') + '</p></div>' +
    '<div class="orden-block"><h4>✨ Detalle</h4><p>' +
    (S.fallecido ? '<strong>Fallecido: '+S.fallecido+'</strong><br>' : '') +
    (S.dirigido ? 'Para: <strong>'+S.dirigido+'</strong><br>' : '') +
    (S.firma ? 'De parte de: '+S.firma+'<br>' : '') +
    (S.tarjeta ? 'Tarjeta: '+S.tarjeta : '') + '</p></div>' +
    '<div class="orden-block"><h4>📋 Pago</h4><p>Canal: ' + (S.canal||'—') +
    '<br>Pago: <span id="od-pago">—</span><br>Atendido: <span id="od-atend">—</span></p></div></div>' +
    (S.mensaje ? '<div class="mensaje-box">✉ "' + S.mensaje + '"' + (S.firma ? '<br><span style="font-size:.8rem">— '+S.firma+'</span>' : '') + '</div>' : '') +
    (S.notas && S.notas !== S.mensaje ? '<div class="notas-box">📝 ' + S.notas + '</div>' : '') +
    '<table class="orden-table"><thead><tr><th>Producto / Servicio</th><th style="text-align:right">Precio</th></tr></thead><tbody>' +
    items.map(it => '<tr><td>' + it.desc + '</td><td style="text-align:right">' + fmt(it.precio) + '</td></tr>').join('') +
    '</tbody></table>' +
    '<div class="orden-totals"><div class="orden-total-row grand"><span>TOTAL</span><span>' + fmt(total) + '</span></div></div>' +
    '<div style="margin-top:28px;padding-top:18px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:36px;font-size:.78rem;color:#8a7d72">' +
    '<div><div style="border-top:1px solid #ccc;margin-top:36px;padding-top:7px;text-align:center">Firma del cliente</div></div>' +
    '<div><div style="border-top:1px solid #ccc;margin-top:36px;padding-top:7px;text-align:center">Firma y sello Fundación</div></div></div>';

  ['metodoPago','atendidoPor'].forEach(id => {
    var el = $(id);
    if (el) el.oninput = () => {
      var op = $('od-pago'); if (op) op.textContent = $('metodoPago').value || '—';
      var oa = $('od-atend'); if (oa) oa.textContent = $('atendidoPor').value || '—';
    };
  });
}

// ── Confirmar y guardar ─────────────────────────────────────
async function confirmarPedido() {
  // Validar autorización
  var cbDatos = $('cb-autorizo-datos');
  if (cbDatos && !cbDatos.checked) { alert('Debes autorizar el tratamiento de tus datos personales para continuar.'); return; }

  S.metodoPago  = $('metodoPago').value;
  S.atendidoPor = $('atendidoPor').value;
  $('loadingMsg').textContent = 'Guardando tu pedido...';
  $('loadingOverlay').classList.add('show');
  try {
    var fecha    = new Date();
    var fechaStr = fecha.toISOString().split('T')[0];
    var horaStr  = fecha.toTimeString().slice(0, 8);
    var c        = S.comprador;
    var docNum   = (c.cedula || c.nit || '').replace(/\D/g, '');
    var terceroId = null;

    // 1. Tercero
    if (docNum) {
      var tRes = await fetch(SUPABASE_URL + '/rest/v1/terceros?numerodoc=eq.' + docNum + '&select=id&limit=1', { headers: sbH() });
      var tRows = await tRes.json();
      if (tRows.length > 0) {
        terceroId = tRows[0].id;
        var upd = { updated_at: new Date().toISOString() };
        var sv = (k, v) => { if (v && String(v).trim()) upd[k] = String(v).trim(); };
        sv('direccion', c.direccion); sv('departamento', c.departamento);
        sv('ciudad', c.ciudad); sv('telefono1', c.celular || c.telefono);
        if (c.tipo === 'Personal') {
          sv('nombres', c.nombres); sv('apellidos', c.apellidos);
          sv('correo_principal', c.correo); sv('correoelectronica', c.correoFactura);
          if (c.nombres && c.apellidos) upd.nombrecompleto = (c.nombres + ' ' + c.apellidos).trim();
        } else {
          sv('razonsocial', c.razonSocial); sv('nitempresa', c.nit);
          sv('contactoempresa', c.contacto); sv('correoelectronica', c.correoFactura);
        }
        await fetch(SUPABASE_URL + '/rest/v1/terceros?id=eq.' + terceroId, {
          method:'PATCH', headers:{ ...sbH(), 'Content-Type':'application/json' }, body:JSON.stringify(upd)
        });
      } else {
        var tNew = await fetch(SUPABASE_URL + '/rest/v1/terceros', {
          method:'POST',
          headers:{ ...sbH(), 'Content-Type':'application/json', 'Prefer':'return=representation' },
          body: JSON.stringify({
            tipodoc: c.tipodoc || (c.tipo === 'Empresa' ? 'NIT' : 'CC'), numerodoc: docNum,
            tipocliente: c.tipo || 'Personal', nombres: c.nombres||'', apellidos: c.apellidos||'',
            nombrecompleto: c.tipo === 'Empresa' ? (c.razonSocial||'') : ((c.nombres||'')+' '+(c.apellidos||'')).trim(),
            razonsocial: c.razonSocial||'', nitempresa: c.nit||'', contactoempresa: c.contacto||'',
            direccion: c.direccion||'', departamento: c.departamento||'', ciudad: c.ciudad||'',
            telefono1: c.celular||'', correo_principal: c.correo||'',
            correoelectronica: c.correoFactura||'', fuente:'Formulario Web'
          })
        });
        var tNewData = await tNew.json();
        if (tNewData && tNewData[0]) terceroId = tNewData[0].id;
      }
    }

    // 2. Pedido
    var nombreComprador = c.tipo === 'Empresa' ? (c.razonSocial||'') : ((c.nombres||'')+' '+(c.apellidos||'')).trim();
    var d = S.destinatario;
    // Leer valores de autorización
    var autoData = $('cb-autorizo-datos') ? $('cb-autorizo-datos').checked : false;
    var autoPub  = $('cb-autorizo-publi') ? $('cb-autorizo-publi').checked : false;

    var pedRes = await fetch(SUPABASE_URL + '/rest/v1/pedidos', {
      method:'POST',
      headers:{ ...sbH(), 'Content-Type':'application/json', 'Prefer':'return=representation' },
      body: JSON.stringify({
        nro_pedido: orderNum, fecha: fechaStr, hora: horaStr,
        canal: S.canal || 'Formulario Web', tipo_cliente: c.tipo || 'Personal',
        tercero_id: terceroId, id_nit_comprador: docNum,
        nombre_razon_social: nombreComprador,
        direccion_comprador: c.direccion||'', departamento: c.departamento||'',
        ciudad_comprador: c.ciudad||'', telefono_comprador: c.celular||'',
        correo_comprador: c.correo||'', correo_factura: c.correoFactura||'',
        nombres_destinatario: d.nombres||'', apellidos_destinatario: d.apellidos||'',
        telefono_destinatario: d.celular||'', ciudad_entrega: d.ciudad||'',
        direccion_entrega: d.direccion||'', referencia_entrega: d.referencia||'',
        ocasion: S.tipoPedido||'', protagonista: S.dirigido||'',
        detalle_protagonista: S.fallecido||'', mensaje: S.mensaje||'',
        firma_mensaje: S.firma||'', observaciones: S.notas||'',
        envio_descripcion: S.envio ? S.envio.l : '',
        costo_envio: S.envio ? S.envio.p : 0,
        subtotal_productos: getTotal() - (S.envio ? S.envio.p : 0),
        total_pedido: getTotal(),
        metodo_pago: S.metodoPago||'', atendido_por: S.atendidoPor||'',
        color_bono: S.tarjeta||'',
        estado: 'Pendiente',
        campana_id: S.campana_id ? parseInt(S.campana_id) : null,
        autorizo_datos: autoData, autorizo_publicidad: autoPub,
        comprobante_pago: null,
        numero_factura: ($('numFacturaInput') ? $('numFacturaInput').value.trim() : '') || null,
        numero_recibo:  ($('numReciboInput')  ? $('numReciboInput').value.trim()  : '') || null,
        leg_facturado:   $('legFacturado')  ? $('legFacturado').checked   : false,
        leg_recibo:      $('legRecibo')     ? $('legRecibo').checked      : false,
        leg_registrado:  $('legRegistrado') ? $('legRegistrado').checked  : false,
        leg_certificado: $('legCertificado')? $('legCertificado').checked : false
      })
    });
    var pedidoData = await pedRes.json();
    var pedidoId   = pedidoData && pedidoData[0] ? pedidoData[0].id : null;

    // 3. Detalle
    if (pedidoId) {
      var lineas = [];
      if (S.bonos && S.bonos.length) S.bonos.forEach(b => lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Bono', subcategoria:S.tipoPedido, producto:b.nombre, cantidad:1, precio_unitario:b.precio, subtotal_linea:b.precio }));
      else if (S.bono) lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Bono', subcategoria:S.tipoPedido, producto:S.bono.nombre, cantidad:1, precio_unitario:S.bono.precio, subtotal_linea:S.bono.precio });
      if (S.empaque && S.empaque.precio) lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Empaque', subcategoria:'Empaque', producto:S.empaque.nombre, cantidad:1, precio_unitario:S.empaque.precio, subtotal_linea:S.empaque.precio });
      S.acompanantes.forEach(a => lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Acompañante', subcategoria:a.subcategoria||'', producto:a.nombre, cantidad:1, precio_unitario:a.precio, subtotal_linea:a.precio }));
      S.productosElegidos.forEach(p => lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Producto', subcategoria:p.subcategoria||'', producto:p.nombre, cantidad:p.qty||1, precio_unitario:p.precio, subtotal_linea:p.precio*(p.qty||1) }));
      if (S.tipoPedido === 'donacion') lineas.push({ pedido_id:pedidoId, nro_pedido:orderNum, fecha:fechaStr, categoria:'Donación', subcategoria:'Donación', producto:'Donación', cantidad:1, precio_unitario:S.valorDonacion, subtotal_linea:S.valorDonacion });
      for (var linea of lineas) {
        await fetch(SUPABASE_URL + '/rest/v1/pedido_detalle', { method:'POST', headers:{ ...sbH(), 'Content-Type':'application/json' }, body:JSON.stringify(linea) });
      }
    }

    // 4. Comprobante
    var fi = $('comprobanteFile');
    if (fi && fi.files && fi.files[0]) {
      try {
        var file = fi.files[0];
        var comprimido = await comprimirImagen(file, 200);
        var ext = file.name.split('.').pop() || 'jpg';
        var nombreArchivo = orderNum + '_comprobante.' + ext;
        var upRes = await fetch('https://sbhbcgxmxnxyfuzggegj.supabase.co/storage/v1/object/comprobantes/' + nombreArchivo, {
          method:'POST',
          headers:{ ...sbH(), 'Content-Type': file.type || 'image/jpeg', 'x-upsert':'true' },
          body: comprimido
        });
        if (upRes.ok) {
          var url = 'https://sbhbcgxmxnxyfuzggegj.supabase.co/storage/v1/object/public/comprobantes/' + nombreArchivo;
          await fetch(SUPABASE_URL + '/rest/v1/pedidos?nro_pedido=eq.' + orderNum, {
            method:'PATCH', headers:{ ...sbH(), 'Content-Type':'application/json' }, body:JSON.stringify({ comprobante_pago: url })
          });
        }
      } catch(eComp) { console.warn('Error comprobante:', eComp); }
    }
  } catch(e) { console.warn('Error guardando:', e); }

  $('loadingOverlay').classList.remove('show');
  mostrarExito();
}

function mostrarExito() {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  $('totalBar').style.display     = 'none';
  $('progressWrap').style.display = 'none';
  $('successSection').classList.add('show');
  $('successNum').textContent = orderNum;
  setTimeout(() => generarPDF(), 1000);
}

function generarPDF() {
  try {
    var ordenEl = $('ordenPrint');
    if (!ordenEl) return;
    var ventana = window.open('', '_blank');
    ventana.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PEDIDO_' + orderNum + '</title><style>' +
      'body{font-family:Helvetica,Arial,sans-serif;color:#1A0A10;padding:30px;font-size:12px}' +
      'h1{color:#E8176B;font-size:18px}' +
      '.header{display:flex;justify-content:space-between;border-bottom:2px solid #F0D8E4;padding-bottom:12px;margin-bottom:16px}' +
      '.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}' +
      '.block h4{font-size:9px;text-transform:uppercase;color:#E8176B;margin-bottom:6px;letter-spacing:.08em}' +
      '.block p{line-height:1.7;color:#5A3A48}' +
      'table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}' +
      'th{background:#FDF8FB;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:1px solid #F0D8E4;color:#5A3A48}' +
      'td{padding:8px 10px;border-bottom:1px solid #F0D8E4}' +
      '.badge{display:inline-block;background:#FDE8F2;color:#E8176B;padding:2px 10px;border-radius:10px;font-weight:600}' +
      '.msg{background:#FDE8F2;border-left:3px solid #E8176B;padding:10px 14px;font-style:italic;margin:12px 0}' +
      '</style></head><body>' +
      '<div class="header"><div><h1>Santiago Corazón</h1><div style="font-size:10px;color:#9A7A88">Fundación Infantil</div></div>' +
      '<div style="text-align:right"><div class="badge">PEDIDO_' + orderNum + '</div>' +
      '<div style="font-size:10px;color:#9A7A88;margin-top:4px">' + new Date().toLocaleDateString('es-CO',{year:'numeric',month:'long',day:'numeric'}) + '</div></div></div>' +
      ordenEl.innerHTML +
      '<div style="margin-top:30px;padding-top:16px;border-top:1px solid #F0D8E4;font-size:10px;color:#9A7A88;text-align:center">' +
      'Este documento es tu comprobante de pedido.<br>www.santiagocorazon.org | 311 724 9887</div>' +
      '</body></html>');
    ventana.document.close();
    setTimeout(() => { ventana.document.title = 'PEDIDO_' + orderNum; ventana.print(); }, 500);
  } catch(e) { console.warn('Error PDF:', e); }
}

function nuevoPedido() { location.reload(); }

// ── Comprimir imagen ────────────────────────────────────────
function comprimirImagen(file, maxKB) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size <= maxKB * 1024) { resolve(file); return; }
    var reader = new FileReader();
    reader.onload = (e) => {
      var img = new Image();
      img.onload = () => {
        var canvas = document.createElement('canvas');
        var w = img.width, h = img.height, maxDim = 1200;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var calidad = 0.8;
        var intentar = () => canvas.toBlob((blob) => {
          if (blob.size <= maxKB * 1024 || calidad <= 0.3) resolve(blob);
          else { calidad -= 0.1; intentar(); }
        }, 'image/jpeg', calidad);
        intentar();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Utilidades UI ───────────────────────────────────────────
function cc(el, cntId) {
  var c = $(cntId);
  if (c) { c.textContent = el.value.length; c.style.color = el.value.length >= 160 ? 'var(--pink)' : 'var(--ink-lt)'; }
}

function mostrarComp(input) {
  if (!input.files || !input.files[0]) return;
  $('compNombre').textContent = input.files[0].name;
  $('compPreview').style.display  = 'flex';
  $('compLabel').style.borderColor = 'var(--pink)';
}

function quitarComp() {
  $('comprobanteFile').value = '';
  $('compPreview').style.display  = 'none';
  $('compLabel').style.borderColor = 'var(--border)';
}
