// ===============================================
// CORE - Config, State, Utils, Auth, Nav
// ===============================================
// ===== CONFIG =====
const API = 'https://chat.adrian-261.workers.dev';
const TBL = {
  usuarios: 'cm_usuarios',
  servicios: 'cm_servicios',
  reservas: 'cm_reservas',
  credenciales: 'cm_credenciales',
  propertyMapping: 'cm_property_mapping',
  inventario: 'inventario',
  kits: 'kits',
  propietarios: 'propietarios',
  gastos: 'gastos_fijos',
  mantenimiento: 'mantenimiento',
  extras: 'limpieza_extras',
  propiedades: 'propiedades_config',
  empleados: 'empleados_cleanmanager',
  alertas: 'alertas_config'
};

// Información de plataformas
const PLATFORMS = {
  avaibook: { name: 'Avaibook', fields: ['apikey', 'userid'], help: 'Obtén tu API Key desde el panel de Avaibook en Configuración → API' },
  icnea: { name: 'Icnea', fields: ['apikey', 'userid'], help: 'Tu API Key e ID de propietario los encuentras en Icnea → Configuración → API' },
  hostify: { name: 'Hostify', fields: ['apikey', 'secret'], help: 'Genera tu API Key desde Hostify → Settings → API' },
  guesty: { name: 'Guesty', fields: ['apikey', 'secret'], help: 'Accede a tu API Key en Guesty → Marketplace → API' },
  smoobu: { name: 'Smoobu', fields: ['apikey'], help: 'Encuentra tu API Key en Smoobu → Configuración → API' },
  lodgify: { name: 'Lodgify', fields: ['apikey'], help: 'Tu API Key está en Lodgify → Configuración → Integraciones → API' }
};
// ===== STATE =====
const S = {
  user: null,
  clienteEmail: null,
  servicios: [],
  inventario: [],
  kits: [],
  propietarios: [],
  gastos: [],
  mantenimiento: [],
  extras: [],
  propiedades: [],
  empleados: [],
  alertas: null,
  reservas: [],
  credenciales: [],
  propertyMappings: []
};

// Variables globales
let currentConsumosMes = new Date().toISOString().slice(0, 7);
let currentLimpiezasMes = new Date().toISOString().slice(0, 7);
const stockForecasts = new Map();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('cm_user');
  if (saved) {
    S.user = JSON.parse(saved);
    S.clienteEmail = S.user.cliente_email;
    initApp();
  } else {
    showLogin();
  }
});

function showLogin() {
  hide('loading-overlay');
  show('login-view');
  hide('app-view');
}

async function initApp() {
  show('loading-overlay');
  hide('login-view');
  try {
    await loadAll();
    hide('loading-overlay');
    show('app-view');
    
    $('#account-name').textContent = S.user.empresa || S.clienteEmail;
    $('#user-name').textContent = S.user.nombre || 'Usuario';
    $('#user-avatar').textContent = (S.user.nombre || 'U').substring(0, 2).toUpperCase();
    
    initFilters();
    renderDashboard();
  } catch (e) {
    console.error(e);
    toast('Error al cargar', 'error');
    hide('loading-overlay');
    show('app-view');
  }
}

async function loadAll() {
  const ce = encodeURIComponent(S.clienteEmail);
  const load = async (t, f = 'cliente_email') => {
    try {
      const r = await fetch(`${API}/supa/list/${t}?${f}=eq.${ce}`);
      return r.ok ? await r.json() : [];
    } catch { return []; }
  };
  
  // Cargar propiedades de ambas fuentes
  const [propConfig, propIntegradas] = await Promise.all([
    load(TBL.propiedades),
    load('v_propiedades')  // Propiedades de integración
  ]);
  
  [S.servicios, S.inventario, S.kits, S.propietarios, S.gastos, S.mantenimiento, S.extras, , S.empleados, S.reservas, S.credenciales, S.propertyMappings] = await Promise.all([
    load(TBL.servicios),
    load(TBL.inventario),
    load(TBL.kits),
    load(TBL.propietarios),
    load(TBL.gastos),
    load(TBL.mantenimiento),
    load(TBL.extras),
    Promise.resolve([]), // placeholder
    load(TBL.empleados, 'email_host'),
    load(TBL.reservas),
    load(TBL.credenciales),
    load(TBL.propertyMapping)
  ]);
  
  // Combinar propiedades: config + integradas (evitando duplicados)
  const configNames = new Set(propConfig.map(p => (p.propiedad_nombre || '').toLowerCase()));
  const integradasNuevas = propIntegradas.filter(p => {
    const nombre = (p.propiedad_nombre || '').toLowerCase();
    return !configNames.has(nombre);
  }).map(p => ({
    ...p,
    source: 'integration',
    external_id: p.avaibook_accommodation_id || p.external_id,
    habitaciones: p.total_rooms || 1,
    banos: p.total_bathrooms || 1
  }));
  
  // Marcar las de config como manuales
  S.propiedades = [
    ...propConfig.map(p => ({ ...p, source: 'manual' })),
    ...integradasNuevas
  ];
  
  const alertas = await load(TBL.alertas);
  S.alertas = alertas[0] || null;
  
  // Alias para compatibilidad
  S.stock = S.inventario;
}
// ===== AUTH =====
function switchAuthTab(tab) {
  $$('.login-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  $('#form-login').style.display = tab === 'login' ? 'block' : 'none';
  $('#form-register').style.display = tab === 'register' ? 'block' : 'none';
  $('#auth-error').style.display = 'none';
}

async function doLogin() {
  const email = $('#login-email').value.trim().toLowerCase();
  const pass = $('#login-password').value;
  if (!email || !pass) return showAuthError('Completa todos los campos');
  
  try {
    const r = await fetch(`${API}/supa/list/${TBL.usuarios}?email=eq.${encodeURIComponent(email)}`);
    const users = await r.json();
    if (!users.length) return showAuthError('Usuario no encontrado');
    
    const user = users[0];
    if (user.password_hash !== pass) return showAuthError('Contraseña incorrecta');
    if (!user.activo) return showAuthError('Cuenta desactivada');
    
    S.user = user;
    S.clienteEmail = user.cliente_email;
    localStorage.setItem('cm_user', JSON.stringify(user));
    
    // Update last login
    fetch(`${API}/supa/patch/${TBL.usuarios}?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_login: new Date().toISOString() })
    });
    
    await initApp();
  } catch (e) {
    showAuthError('Error de conexión');
  }
}

async function doRegister() {
  const empresa = $('#reg-empresa').value.trim();
  const nombre = $('#reg-nombre').value.trim();
  const email = $('#reg-email').value.trim().toLowerCase();
  const telefono = $('#reg-telefono').value.trim();
  const pass = $('#reg-password').value;
  
  if (!empresa || !nombre || !email || !pass) return showAuthError('Completa todos los campos');
  if (pass.length < 6) return showAuthError('Contraseña mínimo 6 caracteres');
  if (!email.includes('@')) return showAuthError('Email no válido');
  
  try {
    // Check existing
    console.log('Checking if email exists...');
    const check = await fetch(`${API}/supa/list/${TBL.usuarios}?email=eq.${encodeURIComponent(email)}`);
    const checkData = await check.json();
    console.log('Check response:', checkData);
    if (checkData.length) return showAuthError('Este email ya está registrado');
    
    // Create user
    const data = {
      email,
      password_hash: pass,
      nombre,
      empresa,
      telefono,
      cliente_email: email,
      rol: 'admin',
      activo: true,
      plan: 'trial'
    };
    
    console.log('Creating user with data:', data);
    const r = await fetch(`${API}/supa/create/${TBL.usuarios}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log('Create response status:', r.status);
    const responseText = await r.text();
    console.log('Create response body:', responseText);
    
    let users;
    try {
      users = JSON.parse(responseText);
    } catch (e) {
      return showAuthError('Error del servidor: ' + responseText.substring(0, 100));
    }
    
    if (!r.ok) {
      return showAuthError('Error: ' + (users.message || users.error || JSON.stringify(users)));
    }
    
    if (!users || !users.length) {
      return showAuthError('No se pudo crear el usuario');
    }
    
    S.user = users[0];
    S.clienteEmail = email;
    localStorage.setItem('cm_user', JSON.stringify(S.user));
    
    toast('¡Cuenta creada!');
    await initApp();
  } catch (e) {
    console.error('Register error:', e);
    showAuthError('Error: ' + e.message);
  }
}

function showAuthError(msg) {
  const el = $('#auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function logout() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('cm_user');
    location.reload();
  }
}
// ===== NAVIGATION =====
function navigate(view) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`)?.classList.add('active');
  
  const titles = { dashboard:'Dashboard', servicios:'Servicios', reservas:'Reservas', stock:'Inventario', kits:'Kits', propiedades:'Propiedades', propietarios:'Propietarios', empleados:'Empleados', limpiezas:'Limpiezas', consumos:'Consumos', extras:'Extras', mantenimiento:'Mantenimiento', gastos:'Gastos Fijos', informes:'Informes', alertas:'Alertas', integraciones:'Integraciones' };
  $('#page-title').textContent = titles[view] || '';
  
  renderView(view);
  closeSidebar();
}

function renderView(v) {
  const renders = { dashboard:renderDashboard, servicios:renderServicios, reservas:renderReservas, stock:renderStock, kits:renderKits, propiedades:renderPropiedades, propietarios:renderPropietarios, empleados:renderEmpleados, limpiezas:renderLimpiezasMes, consumos:renderConsumos, extras:renderExtras, mantenimiento:renderMantenimiento, gastos:renderGastos, informes:renderInformes, alertas:renderAlertas, integraciones:renderIntegraciones, planificador:renderPlanificador };
  renders[v]?.();
}

function toggleSidebar() {
  $('#sidebar').classList.toggle('open');
  $('#mobile-overlay').classList.toggle('open');
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#mobile-overlay').classList.remove('open');
}
// ===== HELPERS =====
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const show = id => document.getElementById(id).style.display = 'flex';
const hide = id => document.getElementById(id).style.display = 'none';

async function create(tbl, data) {
  return fetch(`${API}/supa/create/${tbl}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

async function update(tbl, id, data) {
  return fetch(`${API}/supa/update/${tbl}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

async function remove(tbl, id) {
  return fetch(`${API}/supa/delete/${tbl}/${id}`, {
    method: 'DELETE'
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  
  // Populate selects
  populatePropSelect('serv-propiedad-sel');
  populatePropSelect('extra-prop');
  populatePropSelect('mant-prop');
  populatePropSelect('gasto-prop');
  
  // Empleados
  const empSel = $('#serv-empleado');
  if (empSel) {
    empSel.innerHTML = '<option value="">Sin asignar</option>' + S.empleados.filter(e => e.activo).map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  }
  
  // Defaults
  const hoy = new Date().toISOString().split('T')[0];
  ['serv-fecha-input', 'extra-fecha', 'mant-fecha', 'gasto-fecha'].forEach(id => {
    const el = $('#' + id);
    if (el && !el.value) el.value = hoy;
  });
  
  // Clear edit ID
  if (id === 'modal-servicio' && !$('#serv-edit-id').value) {
    $('#serv-edit-id').value = '';
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Reset form
  if (id === 'modal-servicio') {
    $('#serv-edit-id').value = '';
  }
}

function populatePropSelect(id) {
  const sel = $('#' + id);
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona...</option>' + S.propiedades.map(p => `<option value="${p.propiedad_nombre}">${p.propiedad_nombre}</option>`).join('');
}

function initFilters() {
  // Propiedades filter
  const propFilter = $('#serv-propiedad');
  if (propFilter) {
    propFilter.innerHTML = '<option value="">Todas las propiedades</option>' + S.propiedades.map(p => `<option value="${p.propiedad_nombre}">${p.propiedad_nombre}</option>`).join('');
  }
  
  // Month selectors
  const months = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    });
  }
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  ['extras-mes', 'gastos-mes'].forEach(id => {
    const el = $('#' + id);
    if (el) {
      el.innerHTML = months.map(m => `<option value="${m.value}" ${m.value === current ? 'selected' : ''}>${m.label}</option>`).join('');
    }
  });
  
  // Date filter default
  const servFecha = $('#serv-fecha');
  if (servFecha && !servFecha.value) {
    servFecha.value = now.toISOString().split('T')[0];
  }
}

function toast(msg, type = 'success') {
  const el = $('#toast');
  $('#toast-msg').textContent = msg;
  $('#toast-icon').textContent = type === 'error' ? '✕' : '✓';
  el.className = `toast show ${type}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '0 €';
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function estadoBadge(e) {
  const map = { pendiente: 'badge-warning', confirmado: 'badge-accent', en_proceso: 'badge-warning', completado: 'badge-success', cancelado: 'badge-danger' };
  return map[e] || 'badge-neutral';
}

function empty(icon, text) {
  return `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">${icon}</div><h3>${text}</h3></div>`;
}

// Exportar funciones globales para wrapping
window.initApp = initApp;
window.navigate = navigate;
window.loadAll = loadAll;
