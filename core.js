// ===============================================
// CORE / STATE / HELPERS / API
// ===============================================

const API = window.CM_API || ''; // Base API (Worker o servidor)

const TBL = {
  servicios: 'cm_servicios',
  inventario: 'cm_inventario',
  kits: 'cm_kits',
  propiedades: 'cm_propiedades',
  propietarios: 'cm_propietarios',
  gastos: 'cm_gastos_fijos',
  mantenimiento: 'cm_mantenimiento',
  extras: 'cm_extras',
  reservas: 'cm_reservas',
  credenciales: 'cm_credenciales',
  propertyMapping: 'cm_property_mapping',
  empleados: 'empleados_cleanmanager',
};

// Estado global
const S = {
  clienteEmail: null,
  user: null,
  servicios: [],
  inventario: [],
  kits: [],
  propiedades: [],
  propietarios: [],
  gastos: [],
  mantenimiento: [],
  extras: [],
  empleados: [],
  reservas: [],
  credenciales: [],
  propertyMappings: [],
  stock: [], // alias de inventario
};

// Helper DOM
const $ = (sel) => document.querySelector(sel);

// Helper seguro para clave YYYY-MM (evita problemas de zona horaria/UTC)
const getMonthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Meses actuales (evitamos toISOString)
let currentConsumosMes = getMonthKey();
let currentLimpiezasMes = getMonthKey();

// -----------------------------------------------
// Helpers UI
// -----------------------------------------------
function toast(msg, type = 'info') {
  console.log(`[${type}]`, msg);
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (el.style.display = 'none'), 2200);
}

function formatMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('es-ES');
}

// -----------------------------------------------
// API fetch wrappers
// -----------------------------------------------
async function apiGet(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}`);
  return res.json();
}

async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`PATCH ${url} -> ${res.status}`);
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} -> ${res.status}`);
  return res.json();
}

// -----------------------------------------------
// CRUD helpers (compatibles con tu Worker)
// -----------------------------------------------
async function load(tbl, field = 'cliente_email') {
  if (!API) return [];
  const ce = encodeURIComponent(S.clienteEmail || '');
  const f = encodeURIComponent(field);
  const url = `${API}/supa/list/${tbl}?${f}=eq.${ce}`;
  try {
    const data = await apiGet(url);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('load error', tbl, field, e);
    return [];
  }
}

async function create(tbl, data) {
  if (!API) throw new Error('API no configurada');
  return apiPost(`${API}/supa/create/${tbl}`, data);
}

async function update(tbl, id, data) {
  if (!API) throw new Error('API no configurada');
  return apiPost(`${API}/supa/update/${tbl}/${id}`, data);
}

async function patch(tbl, query, data) {
  if (!API) throw new Error('API no configurada');
  return apiPatch(`${API}/supa/patch/${tbl}${query}`, data);
}

async function remove(tbl, id) {
  if (!API) throw new Error('API no configurada');
  return apiDelete(`${API}/supa/delete/${tbl}/${id}`);
}

// -----------------------------------------------
// Carga inicial
// -----------------------------------------------
async function loadAll() {
  const ce = S.clienteEmail;
  if (!ce) return;

  // Propiedades desde dos fuentes (compat)
  const [
    servicios,
    inventario,
    kits,
    propietarios,
    gastos,
    mantenimiento,
    extras,
    reservas,
    credenciales,
    propertyMappings,
    empleadosCliente,
    empleadosHost
  ] = await Promise.all([
    load(TBL.servicios),
    load(TBL.inventario),
    load(TBL.kits),
    load(TBL.propietarios),
    load(TBL.gastos),
    load(TBL.mantenimiento),
    load(TBL.extras),
    load(TBL.reservas),
    load(TBL.credenciales),
    load(TBL.propertyMapping),
    load(TBL.empleados, 'cliente_email'),
    load(TBL.empleados, 'email_host')
  ]);

  S.servicios = servicios || [];
  S.inventario = inventario || [];
  S.kits = kits || [];
  S.propietarios = propietarios || [];
  S.gastos = gastos || [];
  S.mantenimiento = mantenimiento || [];
  S.extras = extras || [];
  S.reservas = reservas || [];
  S.credenciales = credenciales || [];
  S.propertyMappings = propertyMappings || [];

  // Unir empleados por compatibilidad de esquema
  const empMap = new Map();
  [...(empleadosCliente || []), ...(empleadosHost || [])].forEach(e => {
    if (e && e.id != null && !empMap.has(e.id)) empMap.set(e.id, e);
  });
  S.empleados = Array.from(empMap.values());

  // Alias de stock
  S.stock = S.inventario;

  // Construir lista de propiedades desde inventario/servicios si procede
  if (typeof buildPropiedades === 'function') {
    buildPropiedades();
  }

  // Render inicial
  if (typeof renderAll === 'function') {
    renderAll();
  }
}

// -----------------------------------------------
// Navegación
// -----------------------------------------------
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add('active');

  const titles = {
    dashboard:'Dashboard',
    servicios:'Servicios',
    reservas:'Reservas',
    stock:'Inventario',
    kits:'Kits',
    propiedades:'Propiedades',
    propietarios:'Propietarios',
    empleados:'Empleados',
    limpiezas:'Limpiezas',
    consumos:'Consumos',
    extras:'Extras',
    mantenimiento:'Mantenimiento',
    gastos:'Gastos Fijos',
    informes:'Informes',
    alertas:'Alertas',
    integraciones:'Integraciones',
    planificador:'Planificador'
  };
  const t = document.getElementById('page-title');
  if (t) t.textContent = titles[view] || 'CleanManager';

  const renders = {
    dashboard: window.renderDashboard,
    servicios: window.renderServicios,
    reservas: window.renderReservas,
    stock: window.renderStock,
    kits: window.renderKits,
    propiedades: window.renderPropiedades,
    propietarios: window.renderPropietarios,
    empleados: window.renderEmpleados,
    limpiezas: window.renderLimpiezasMes,
    consumos: window.renderConsumos,
    extras: window.renderExtras,
    mantenimiento: window.renderMantenimiento,
    gastos: window.renderGastos,
    informes: window.renderInformes,
    alertas: window.renderAlertas,
    integraciones: window.renderIntegraciones,
    planificador: window.renderPlanificador
  };

  try {
    renders[view]?.();
  } catch (e) {
    console.error(e);
  }
}

// -----------------------------------------------
// Filtros / Selects
// -----------------------------------------------
function initFilters() {
  // Select de propietarios (global)
  const propSel = document.getElementById('filter-propietario');
  if (propSel) {
    propSel.innerHTML = '<option value="">Todos</option>' +
      (S.propietarios || []).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  }

  // Select de empleados en formularios de servicios
  const empSel = document.getElementById('serv-empleado-select');
  if (empSel) {
    empSel.innerHTML =
      '<option value="">Sin asignar</option>' +
      (S.empleados || []).filter(e => e.activo).map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
      ).join('');
  }
}

// -----------------------------------------------
// Init App
// -----------------------------------------------
async function initApp() {
  // Derivar clienteEmail
  S.clienteEmail =
    window.CM_CLIENTE_EMAIL ||
    localStorage.getItem('cm_cliente_email') ||
    '';

  if (!S.clienteEmail) {
    console.warn('Sin cliente email');
    return;
  }

  localStorage.setItem('cm_cliente_email', S.clienteEmail);

  try {
    await loadAll();
    initFilters();
    navigate('dashboard');
  } catch (e) {
    console.error(e);
    toast('Error cargando datos', 'error');
  }
}

window.initApp = initApp;
window.navigate = navigate;
window.loadAll = loadAll;
window.load = load;
window.create = create;
window.update = update;
window.patch = patch;
window.remove = remove;

window.S = S;
window.TBL = TBL;
window.currentConsumosMes = currentConsumosMes;
window.currentLimpiezasMes = currentLimpiezasMes;
window.getMonthKey = getMonthKey;
window.toast = toast;
window.formatMoney = formatMoney;
window.formatDate = formatDate;
