// ===============================================
// PLANIFICADOR PRO - CleanManager
// ===============================================

// CSS del planificador
const PLANNER_CSS = `
  #planner-app {
    --font-ui: system-ui, -apple-system, sans-serif;
    --bg: #ffffff;
    --text: #1f2937;
    --border: #e5e7eb;
    --c-assigned: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    --c-unassigned: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    --c-urgent: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    --c-done: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
    --pat-blocked: repeating-linear-gradient(45deg, #fee2e2, #fee2e2 10px, #fecaca 10px, #fecaca 20px);
    font-family: var(--font-ui);color: var(--text);background: #f9fafb;border-radius: 8px;padding: 20px;min-height: 700px;display: flex;flex-direction: column;gap: 15px;position: relative;
  }
  #planner-app * { box-sizing: border-box; }
  #planner-app.blocking-mode .pl-body { cursor: cell; }
  #planner-app.blocking-mode .drop-zone { background: rgba(254, 226, 226, 0.2); }
  #planner-app.blocking-mode .pl-card { pointer-events: none; opacity: 0.3; filter: grayscale(1); }
  .pl-block { position: absolute; top: 2px; bottom: 2px; background: var(--pat-blocked); border: 1px solid #ef4444; border-radius: 4px; z-index: 50; display: flex; align-items: center; justify-content: center; color: #b91c1c; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; opacity: 0.9; transition: all 0.2s; }
  .pl-block.recurring { background: repeating-linear-gradient(45deg, #fef3c7, #fef3c7 10px, #fde68a 10px, #fde68a 20px); border-color: #f59e0b; color: #b45309; }
  .pl-block.manual { background: repeating-linear-gradient(45deg, #fee2e2, #fee2e2 10px, #fecaca 10px, #fecaca 20px); border-color: #ef4444; color: #b91c1c; }
  #planner-app.blocking-mode .pl-block { pointer-events: auto; cursor: pointer; }
  #planner-app.blocking-mode .pl-block.manual:hover { background: #ef4444; color: white; }
  #planner-app.blocking-mode .pl-block.manual:hover::after { content: " ✕"; }
  #planner-app.blocking-mode .pl-block.recurring { pointer-events: none; cursor: not-allowed; }
  .pl-header { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); gap: 15px; flex-wrap: wrap; }
  .pl-title h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #111; }
  .pl-status { font-size: 0.85rem; color: #6b7280; margin-top: 4px; }
  .pl-controls { display: flex; gap: 10px; align-items: center; }
  .pl-btn { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.1s; color: #374151; display: flex; align-items: center; gap: 5px; }
  .pl-btn:hover { background: #f3f4f6; }
  .btn-ai { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; box-shadow: 0 2px 5px rgba(37, 99, 235, 0.3); }
  .btn-ai:hover { box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4); transform: translateY(-1px); }
  .btn-block-mode { border: 2px dashed #ef4444; color: #ef4444; }
  .btn-block-mode.active { background: #ef4444; color: white; border-style: solid; animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
  .pl-views { background: #f3f4f6; padding: 4px; border-radius: 8px; display: flex; gap: 2px; }
  .pl-view-btn { border: none; background: transparent; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; color: #64748b; font-size: 0.85rem; }
  .pl-view-btn.active { background: white; color: #8b5cf6; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
  .pl-body { flex: 1; background: white; border: 1px solid var(--border); border-radius: 12px; overflow: auto; display: flex; flex-direction: column; position: relative; min-height: 500px; }
  .pl-grid { display: grid; min-width: 100%; }
  .pl-head-cell { padding: 12px; text-align: center; font-weight: 600; font-size: 0.85rem; background: #f9fafb; border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); position: sticky; top: 0; z-index: 20; color: #4b5563; }
  .pl-head-cell.first { left: 0; z-index: 30; background: #fafbfc; width: 240px; text-align: left; padding-left: 20px; box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05); }
  .pl-today { color: #8b5cf6; background: #f3e8ff !important; }
  .pl-row-head { padding: 10px 20px; background: #fafbfc; border-right: 2px solid var(--border); border-bottom: 1px solid var(--border); position: sticky; left: 0; z-index: 10; width: 240px; display: flex; flex-direction: column; justify-content: center; box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05); }
  .pl-name { font-weight: 700; font-size: 0.9rem; color: #111; display: flex; justify-content: space-between; align-items: center; }
  .pl-meta { font-size: 0.7rem; color: #6b7280; margin-top: 2px; font-weight: 500; display: flex; gap: 8px; }
  .pl-tag { padding: 1px 5px; border-radius: 4px; font-size: 0.65rem; background: #e5e7eb; color: #4b5563; }
  .pl-tag.fijo { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .pl-tag.star { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .over-limit { color: #dc2626 !important; font-weight: 700; }
  .pl-cell { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: white; position: relative; }
  .pl-cell:nth-child(odd) { background: #fafafa; }
  .day-total-badge { position: absolute; bottom: 2px; right: 4px; font-size: 0.65rem; color: #9ca3af; font-weight: 700; background: rgba(255, 255, 255, 0.8); padding: 1px 4px; border-radius: 4px; pointer-events: none; z-index: 4; }
  .pl-overlay { position: absolute; inset: 0; z-index: 5; }
  .pl-overlay.drag-over { background: rgba(139, 92, 246, 0.1); }
  .pl-card { position: absolute; height: 54px; border-radius: 6px; padding: 4px 4px 4px 26px; cursor: grab; display: flex; flex-direction: column; justify-content: center; color: white; font-size: 0.75rem; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); z-index: 10; overflow: hidden; transition: box-shadow 0.2s, opacity 0.2s; }
  .pl-card:active { cursor: grabbing; }
  .pl-card.dragging { opacity: 0.5; }
  .pl-card:hover { z-index: 50; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); }
  .pl-card.assigned { background: var(--c-assigned); }
  .pl-card.unassigned { background: var(--c-unassigned); border: 2px dashed rgba(255, 255, 255, 0.6); }
  .pl-card.urgent { background: var(--c-urgent) !important; border: 1px solid #991b1b; }
  .pl-card.done { background: var(--c-done) !important; border: 2px solid #16a34a !important; color: #166534 !important; }
  .pl-card.done .pl-txt, .pl-card.done .pl-info { color: #166534 !important; }
  .pl-info { display: flex; align-items: center; gap: 3px; margin-bottom: 2px; flex-wrap: wrap; }
  .pl-txt { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8rem; }
  .pl-add-btn { position: absolute; top: 0; bottom: 0; left: 0; width: 22px; background: rgba(0, 0, 0, 0.1); border: none; color: white; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 100; transition: background 0.2s; }
  .pl-add-btn:hover { background: rgba(255, 255, 255, 0.4); }
  .pl-resize { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; cursor: e-resize; z-index: 90; background: transparent; }
  .pl-resize:hover { background: rgba(255,255,255,0.3); }
  .pl-ghost { position: absolute; background: rgba(139, 92, 246, 0.2); border: 2px dashed #8b5cf6; border-radius: 6px; pointer-events: none; z-index: 8; transition: all 0.05s linear; }
  .pl-ghost.error { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
  .pl-loader { position: absolute; inset: 0; background: rgba(255, 255, 255, 0.9); z-index: 100; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #6b7280; font-size: 0.9rem; }
  .pl-spinner { width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .pl-modal-bg { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 2000; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
  .pl-modal-bg.open { display: flex; }
  .pl-modal { background: white; padding: 20px; border-radius: 12px; width: 380px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
  .pl-list { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin: 15px 0; }
  .pl-opt { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border); transition: all 0.15s; }
  .pl-opt:hover { background: #f3f4f6; border-color: #8b5cf6; }
  .pl-opt input[type="radio"] { width: 18px; height: 18px; accent-color: #8b5cf6; }
  .ai-row { margin-bottom: 15px; }
  .ai-head { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 5px; }
  .ai-range { width: 100%; accent-color: #2563eb; }
  .ai-toggle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #eff6ff; padding: 10px; border-radius: 6px; border: 1px solid #bfdbfe; }
  .ai-toggle { width: 20px; height: 20px; accent-color: #2563eb; }
  .pl-toast { position: fixed; bottom: 20px; right: 20px; background: #1f2937; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; transform: translateY(100px); transition: transform 0.3s; font-size: 0.9rem; }
  .pl-toast.show { transform: translateY(0); }
  .p-tooltip { position: fixed; background: white; border: 1px solid var(--border); padding: 12px 14px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15); z-index: 9999; pointer-events: none; opacity: 0; transition: opacity 0.15s; font-size: 0.85rem; min-width: 260px; max-width: 320px; }
  .p-tooltip.visible { opacity: 1; }
  .p-tooltip .tt-head { font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; color: #111; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  .p-tooltip .tt-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.85rem; gap: 10px; }
  .p-tooltip .tt-row span:first-child { color: #6b7280; white-space: nowrap; }
  .p-tooltip .tt-row b { text-align: right; }
  .max-emp-btn { min-width: 50px; justify-content: center; }
  .max-emp-btn.active { background: #8b5cf6; color: white; border-color: #8b5cf6; }
`;

// HTML del planificador
const PLANNER_HTML = `
<div id="planner-app">
  <div class="pl-header">
    <div class="pl-title"><h2>📅 Planificador Pro</h2><div id="pl-user-status" class="pl-status">Conectando...</div></div>
    <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
      <button id="pl-btn-block-mode" class="pl-btn btn-block-mode"><span>🚫 Bloqueos</span></button>
      <button id="pl-btn-auto" class="pl-btn btn-ai"><span>✨ Auto-Asignar</span></button>
      <button id="pl-btn-fast" class="pl-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none;"><span>⚡ Rápido</span></button>
      <button id="pl-btn-send" class="pl-btn" style="background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; border: none;"><span>📲 Enviar</span></button>
      <button id="pl-btn-reset" class="pl-btn"><span>🗑️ Reset</span></button>
      <div class="pl-views">
        <button class="pl-view-btn" data-view="month">Mes</button>
        <button class="pl-view-btn" data-view="week">Semana</button>
        <button class="pl-view-btn active" data-view="day">Día</button>
      </div>
    </div>
    <div class="pl-controls">
      <button id="pl-btn-prev" class="pl-btn">‹</button>
      <span id="pl-label-date" style="font-weight:700; min-width:140px; text-align:center;">...</span>
      <button id="pl-btn-next" class="pl-btn">›</button>
    </div>
  </div>
  <div class="pl-body">
    <div id="pl-loader" class="pl-loader"><div class="pl-spinner"></div><span>Cargando datos...</span></div>
    <div id="pl-content"></div>
  </div>
</div>

<div id="pl-modal" class="pl-modal-bg">
  <div class="pl-modal">
    <h3 style="margin:0">👥 Asignar Empleado</h3>
    <p style="margin:5px 0 0 0; font-size:0.85rem; color:#6b7280;">Selecciona un limpiador</p>
    <div id="pl-cleaner-list" class="pl-list"></div>
    <div style="display:flex; justify-content:flex-end; gap:10px">
      <button id="pl-modal-cancel" class="pl-btn">Cancelar</button>
      <button id="pl-modal-save" class="pl-btn" style="background:#8b5cf6; color:white; border:none;">💾 Guardar</button>
    </div>
  </div>
</div>

<div id="pl-ai-modal" class="pl-modal-bg">
  <div class="pl-modal">
    <h3 style="margin:0 0 10px 0;">🤖 Auto-Asignación</h3>
    <div class="ai-toggle-row">
      <input type="checkbox" id="pl-ai-finish-15" class="ai-toggle">
      <label for="pl-ai-finish-15" style="font-weight:600; font-size:0.9rem; cursor:pointer;">Terminar antes de 15:00</label>
    </div>
    <div class="ai-row">
      <div class="ai-head"><span>👥 Máx empleados/tarea</span></div>
      <div style="display:flex; gap:10px; margin-top:5px;">
        <button type="button" class="pl-btn max-emp-btn active" data-val="1">1</button>
        <button type="button" class="pl-btn max-emp-btn" data-val="2">2</button>
      </div>
    </div>
    <div class="ai-row">
      <div class="ai-head"><span>Priorizar Fijos</span> <span id="pl-v-fixed">50%</span></div>
      <input type="range" class="ai-range" id="pl-r-fixed" min="0" max="100" value="50">
    </div>
    <div class="ai-row">
      <div class="ai-head"><span>Rating (★)</span> <span id="pl-v-rating">40%</span></div>
      <input type="range" class="ai-range" id="pl-r-rating" min="0" max="100" value="40">
    </div>
    <div class="ai-row">
      <div class="ai-head"><span>Balance Carga</span> <span id="pl-v-load">60%</span></div>
      <input type="range" class="ai-range" id="pl-r-load" min="0" max="100" value="60">
    </div>
    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
      <button id="pl-ai-cancel" class="pl-btn">Cancelar</button>
      <button id="pl-ai-run" class="pl-btn btn-ai">🚀 Ejecutar</button>
    </div>
  </div>
</div>

<div id="pl-toast" class="pl-toast">Guardado</div>
<div id="pl-tooltip" class="p-tooltip"></div>
`;

// Variables globales
let plannerApp = null;

// Función para renderizar el planificador
function renderPlanificador() {
  const container = document.getElementById('planner-container');
  if (!container) return;
  
  // Inyectar CSS
  if (!document.getElementById('planner-styles')) {
    const style = document.createElement('style');
    style.id = 'planner-styles';
    style.textContent = PLANNER_CSS;
    document.head.appendChild(style);
  }
  
  // Inyectar HTML
  container.innerHTML = PLANNER_HTML;
  
  // Inicializar
  setTimeout(() => {
    plannerApp = new PlannerApp();
    plannerApp.init();
  }, 100);
}

// Clase principal
class PlannerApp {
  constructor() {
    this.date = new Date();
    this.view = 'day';
    this.tasks = [];
    this.cleaners = [];
    this.blocks = [];
    this.startH = 6;
    this.endH = 22;
    this.blockMode = false;
    this.editingId = null;
    this.maxEmployees = 1;
    this.config = null;
    
    this.els = {
      status: document.getElementById('pl-user-status'),
      loader: document.getElementById('pl-loader'),
      content: document.getElementById('pl-content'),
      dateLabel: document.getElementById('pl-label-date'),
      modal: document.getElementById('pl-modal'),
      aiModal: document.getElementById('pl-ai-modal'),
      toast: document.getElementById('pl-toast'),
      tooltip: document.getElementById('pl-tooltip')
    };
  }

  async init() {
    // Status
    this.els.status.innerHTML = S.clienteEmail ? `Usuario: <b>${S.clienteEmail}</b>` : `⚠️ Modo Admin`;
    
    // Cargar limpiadores
    this.loadCleaners();
    
    // Event listeners
    this.setupEventListeners();
    
    // Render inicial
    await this.renderStructure();
  }

  setupEventListeners() {
    // Navegación
    document.getElementById('pl-btn-prev').onclick = () => this.move(-1);
    document.getElementById('pl-btn-next').onclick = () => this.move(1);
    
    // Vistas
    document.querySelectorAll('.pl-view-btn').forEach(b => {
      b.onclick = () => this.setView(b.dataset.view);
    });
    
    // Botones principales
    document.getElementById('pl-btn-block-mode').onclick = () => this.toggleBlockMode();
    document.getElementById('pl-btn-auto').onclick = () => this.els.aiModal.classList.add('open');
    document.getElementById('pl-btn-fast').onclick = () => this.runFastOptimize();
    document.getElementById('pl-btn-send').onclick = () => this.sendToCleaners();
    document.getElementById('pl-btn-reset').onclick = () => this.unassignAll();
    
    // Modal asignar
    document.getElementById('pl-modal-cancel').onclick = () => this.els.modal.classList.remove('open');
    document.getElementById('pl-modal-save').onclick = () => this.saveAssignments();
    
    // Modal AI
    document.getElementById('pl-ai-cancel').onclick = () => this.els.aiModal.classList.remove('open');
    document.getElementById('pl-ai-run').onclick = () => this.runAutoAssign();
    
    // Max empleados
    document.querySelectorAll('.max-emp-btn').forEach(b => {
      b.onclick = () => {
        this.maxEmployees = parseInt(b.dataset.val);
        document.querySelectorAll('.max-emp-btn').forEach(x => x.classList.toggle('active', x.dataset.val == this.maxEmployees));
      };
    });
    
    // Ranges
    ['fixed', 'rating', 'load'].forEach(k => {
      const r = document.getElementById(`pl-r-${k}`);
      const v = document.getElementById(`pl-v-${k}`);
      if (r && v) r.oninput = () => v.innerText = r.value + '%';
    });
  }

  loadCleaners() {
    // Usar empleados de S
    if (S.empleados && S.empleados.length > 0) {
      this.cleaners = S.empleados.filter(e => e.activo !== false).map(e => ({
        id: e.id,
        name: e.nombre || 'Sin Nombre',
        phone: e.telefono || null,
        offs: (e.dias_libres || []).map(d => parseInt(d)),
        type: e.tipo || 'Externo',
        rating: e.rating || 3,
        maxHours: e.horas_maximas || 40,
        price: e.precio_hora || 15
      })).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      this.cleaners = [];
    }
    this.cleaners.unshift({ id: '', name: 'Sin Asignar', phone: null, offs: [], type: '', rating: 0, maxHours: 999, price: 0 });
  }

  setView(v) {
    this.view = v;
    document.querySelectorAll('.pl-view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    this.renderStructure();
  }

  move(d) {
    if (this.view === 'month') this.date.setMonth(this.date.getMonth() + d);
    else if (this.view === 'week') this.date.setDate(this.date.getDate() + (d * 7));
    else this.date.setDate(this.date.getDate() + d);
    this.renderStructure();
  }

  toggleBlockMode() {
    this.blockMode = !this.blockMode;
    document.getElementById('planner-app').classList.toggle('blocking-mode', this.blockMode);
    document.getElementById('pl-btn-block-mode').classList.toggle('active', this.blockMode);
    this.toast(this.blockMode ? '🛑 Modo bloqueos activado' : 'Modo normal');
  }

  getConfig() {
    const y = this.date.getFullYear(), m = this.date.getMonth();
    let s, e, cols = [], title = '';
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = new Date();

    if (this.view === 'month') {
      s = new Date(y, m, 1);
      e = new Date(y, m + 1, 0);
      title = s.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      for (let i = 1; i <= e.getDate(); i++) {
        const d = new Date(y, m, i);
        cols.push({
          label: i,
          sub: d.toLocaleDateString('es-ES', { weekday: 'narrow' }),
          date: iso(d),
          d: d.getDay(),
          today: d.toDateString() === today.toDateString()
        });
      }
    } else if (this.view === 'week') {
      const d = new Date(this.date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      s = new Date(d.setDate(diff));
      e = new Date(s);
      e.setDate(e.getDate() + 6);
      title = `${s.getDate()} - ${e.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      for (let i = 0; i < 7; i++) {
        const d = new Date(s);
        d.setDate(d.getDate() + i);
        cols.push({
          label: d.getDate(),
          sub: d.toLocaleDateString('es-ES', { weekday: 'short' }),
          date: iso(d),
          d: d.getDay(),
          today: d.toDateString() === today.toDateString()
        });
      }
    } else {
      s = new Date(this.date);
      e = new Date(this.date);
      title = s.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      for (let h = this.startH; h <= this.endH; h++) {
        cols.push({
          label: `${h}:00`,
          sub: '',
          hour: h,
          date: iso(s),
          d: s.getDay(),
          today: s.toDateString() === today.toDateString()
        });
      }
    }
    return { s, e, cols, title };
  }

  async renderStructure() {
    this.els.loader.style.display = 'flex';
    this.config = this.getConfig();
    this.els.dateLabel.textContent = this.config.title;
    await this.loadData();
    this.refreshUI();
    this.els.loader.style.display = 'none';
  }

  async loadData() {
    const cfg = this.config;
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = iso(cfg.s);
    const endD = new Date(cfg.e);
    endD.setDate(endD.getDate() + 1);
    const end = iso(endD);

    // Convertir servicios a tareas
    this.tasks = (S.servicios || []).filter(srv => {
      const fecha = srv.fecha_servicio;
      return fecha >= start && fecha < end;
    }).map(srv => {
      const emp = S.empleados?.find(e => e.id === srv.empleado_id);
      const prop = S.propiedades?.find(p => p.id === srv.propiedad_id);
      return {
        id: srv.id,
        propiedad: srv.propiedad_nombre || prop?.nombre || 'Sin Propiedad',
        property: srv.propiedad_nombre || prop?.nombre || 'Sin Propiedad',
        direccion: prop?.direccion || srv.direccion || null,
        date: srv.fecha_servicio,
        fecha: srv.fecha_servicio,
        hora: srv.hora_inicio || '10:00',
        duracion: srv.duracion_minutos || 60,
        empleado_id: srv.empleado_id || null,
        empleado_nombre: emp?.nombre || (srv.empleado_id ? 'Empleado' : 'Sin Asignar'),
        estado: srv.estado || 'pendiente',
        huesped: srv.huesped_nombre || '',
        tipo: srv.tipo_servicio || 'checkout'
      };
    });

    this.blocks = [];
  }

  refreshUI() {
    if (!this.config) return;
    const cfg = this.config;

    // Mapear tareas por limpiador
    const map = new Map();
    this.cleaners.forEach(c => map.set(c.name, {
      id: c.id,
      tasks: [],
      offs: c.offs,
      totalMin: 0,
      dailyMin: {},
      type: c.type,
      rating: c.rating,
      maxHours: c.maxHours
    }));

    this.tasks.forEach(t => {
      const name = t.empleado_nombre || 'Sin Asignar';
      if (!map.has(name)) map.set(name, { id: '', tasks: [], offs: [], totalMin: 0, dailyMin: {}, type: '', rating: 0, maxHours: 40 });
      const entry = map.get(name);
      entry.tasks.push(t);
      entry.totalMin += t.duracion;
      if (!entry.dailyMin[t.fecha]) entry.dailyMin[t.fecha] = 0;
      entry.dailyMin[t.fecha] += t.duracion;
    });

    // Ordenar
    const sorted = [];
    this.cleaners.forEach(c => {
      if (map.has(c.name)) {
        sorted.push({ name: c.name, ...map.get(c.name) });
        map.delete(c.name);
      }
    });
    map.forEach((v, k) => sorted.push({ name: k, ...v }));

    // Construir grid
    const colWidth = this.view === 'day' ? '80px' : 'minmax(80px, 1fr)';
    const gridWidth = this.view === 'day' ? `${240 + (cfg.cols.length * 80)}px` : '100%';

    let h = `<div class="pl-grid" style="grid-template-columns: 240px repeat(${cfg.cols.length}, ${colWidth}); min-width: ${gridWidth};">`;
    h += '<div class="pl-head-cell first">Limpiador</div>';
    cfg.cols.forEach(c => h += `<div class="pl-head-cell ${c.today ? 'pl-today' : ''}">${c.sub} <span style="font-size:1.1em">${c.label}</span></div>`);

    sorted.forEach(c => {
      const minH = this.view === 'month' ? 60 : 80;
      const weeklyH = (c.totalMin / 60).toFixed(1);
      let tags = '';
      if (c.type === 'Fijo') tags += `<span class="pl-tag fijo">Fijo</span>`;
      if (c.rating) tags += `<span class="pl-tag star">★${c.rating}</span>`;
      const isOver = parseFloat(weeklyH) > c.maxHours;

      h += `<div class="pl-row-head" style="min-height:${minH}px">
        <div class="pl-name"><span>${c.name}</span> ${tags}</div>
        <div class="pl-meta">
          <span>📋 ${c.tasks.length}</span>
          <span class="${isOver ? 'over-limit' : ''}">⏱ ${weeklyH}h / ${c.maxHours}h</span>
        </div>
      </div>`;

      h += `<div style="grid-column:2/-1; position:relative; min-height:${minH}px; display:grid; grid-template-columns:repeat(${cfg.cols.length}, 1fr)">`;
      for (let i = 0; i < cfg.cols.length; i++) {
        let cellInner = '';
        if (this.view !== 'day') {
          const dayMin = c.dailyMin[cfg.cols[i].date] || 0;
          if (dayMin > 0) cellInner = `<div class="day-total-badge">${(dayMin / 60).toFixed(1)}h</div>`;
        }
        h += `<div class="pl-cell">${cellInner}</div>`;
      }
      h += `<div class="pl-overlay drop-zone" data-name="${c.name}" data-id="${c.id || ''}"></div></div>`;
    });

    h += '</div>';
    this.els.content.innerHTML = h;

    // Dibujar bloqueos y barras
    this.drawBlocks(sorted, cfg);
    this.drawBars(sorted, cfg);
    this.setupDrop();

    // Scroll a hora 8 en vista día
    if (this.view === 'day') {
      const scrollTo = (8 - this.startH) * 80;
      this.els.content.parentElement.scrollLeft = Math.max(0, scrollTo);
    }
  }

  drawBlocks(list, cfg) {
    const w = 100 / cfg.cols.length;
    list.forEach(c => {
      if (c.name === 'Sin Asignar') return;
      const el = document.querySelector(`.drop-zone[data-name="${c.name}"]`);
      if (!el) return;
      
      // Días libres recurrentes
      if (c.offs && c.offs.length) {
        cfg.cols.forEach((col, i) => {
          if (c.offs.includes(col.d)) {
            this.mkBlock(el, i * w, w, 'LIBRE', true);
          }
        });
      }
    });
  }

  mkBlock(el, left, width, txt, isRecurring = false) {
    const d = document.createElement('div');
    d.className = 'pl-block' + (isRecurring ? ' recurring' : ' manual');
    d.style.left = left + '%';
    d.style.width = width + '%';
    d.innerText = this.view === 'month' ? '🔄' : txt;
    el.appendChild(d);
  }

  drawBars(list, cfg) {
    const self = this;
    list.forEach(c => {
      const el = document.querySelector(`.drop-zone[data-name="${c.name}"]`);
      if (!el) return;

      const stackMap = {};

      c.tasks.forEach(t => {
        const dStr = t.fecha;
        const [hh, mm] = (t.hora || '10:00').split(':').map(Number);
        const durH = t.duracion / 60;

        let idx = -1, left = 0, width = 0;
        const wCol = 100 / cfg.cols.length;

        if (self.view === 'day') {
          const taskDate = t.fecha;
          const viewDate = cfg.cols[0]?.date;
          if (taskDate !== viewDate) return;
          
          idx = cfg.cols.findIndex(col => col.hour === hh);
          if (idx !== -1) {
            left = (idx * wCol) + ((mm / 60) * wCol);
            width = durH * wCol;
          } else return;
        } else {
          idx = cfg.cols.findIndex(col => col.date === dStr);
          if (idx !== -1) {
            left = idx * wCol;
            width = wCol;
          }
        }

        if (idx === -1) return;

        if (!stackMap[idx]) stackMap[idx] = 0;
        const stack = stackMap[idx]++;

        const bar = document.createElement('div');
        let cls = 'pl-card ' + (c.name === 'Sin Asignar' ? 'unassigned' : 'assigned');
        if (t.estado === 'completado') cls += ' done';
        else if (t.tipo === 'urgente') cls += ' urgent';
        bar.className = cls;
        bar.style.left = left + '%';
        bar.style.width = `calc(${width}% - 4px)`;
        bar.style.top = (6 + stack * (self.view === 'month' ? 38 : 58)) + 'px';
        if (self.view === 'month') bar.style.height = '34px';

        const doneIcon = t.estado === 'completado' ? '✅ ' : '';
        bar.innerHTML = `
          <button class="pl-add-btn">+</button>
          <div class="pl-txt">${doneIcon}${t.propiedad}</div>
        `;
        
        bar.draggable = true;
        bar.dataset.id = t.id;
        bar.dataset.name = c.name;
        bar.dataset.date = dStr;
        bar.dataset.hora = t.hora;

        // Botón + para asignar
        bar.querySelector('.pl-add-btn').onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          self.editingId = t.id;
          self.openAssignModal(t.empleado_id);
        };

        // Tooltip
        bar.onmouseenter = function() {
          self.els.tooltip.innerHTML = `
            <div class="tt-head">${t.propiedad}</div>
            <div class="tt-row"><span>Hora:</span> <b>${t.hora}</b></div>
            <div class="tt-row"><span>Duración:</span> <b>${t.duracion} min</b></div>
            <div class="tt-row"><span>Asignado:</span> <b>${t.empleado_nombre}</b></div>
            <div class="tt-row"><span>Estado:</span> <b>${t.estado}</b></div>
            ${t.huesped ? `<div class="tt-row"><span>Huésped:</span> <b>${t.huesped}</b></div>` : ''}
          `;
          self.els.tooltip.classList.add('visible');
        };
        bar.onmouseleave = function() { self.els.tooltip.classList.remove('visible'); };
        bar.onmousemove = function(e) {
          self.els.tooltip.style.left = (e.clientX + 15) + 'px';
          self.els.tooltip.style.top = (e.clientY + 15) + 'px';
        };

        // Drag
        self.setupDrag(bar);

        // Resize en vista día
        if (self.view === 'day') {
          const rs = document.createElement('div');
          rs.className = 'pl-resize';
          bar.appendChild(rs);
          self.setupResize(rs, bar, t.id, wCol);
        }

        el.appendChild(bar);
      });
    });
  }

  setupDrag(el) {
    const self = this;
    el.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: el.dataset.id,
        name: el.dataset.name,
        date: el.dataset.date,
        hora: el.dataset.hora
      }));
      el.classList.add('dragging');
    });
    
    el.addEventListener('dragend', function() {
      el.classList.remove('dragging');
      document.querySelectorAll('.pl-ghost').forEach(g => g.remove());
      document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('drag-over'));
    });
  }

  setupDrop() {
    const self = this;
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (self.blockMode) return;
        
        zone.classList.add('drag-over');
        
        // Ghost
        const r = zone.getBoundingClientRect();
        const w = r.width / self.config.cols.length;
        const idx = Math.floor((e.clientX - r.left) / w);
        
        let ghost = zone.querySelector('.pl-ghost');
        if (!ghost) {
          ghost = document.createElement('div');
          ghost.className = 'pl-ghost';
          zone.appendChild(ghost);
        }
        ghost.style.left = (idx * w) + 'px';
        ghost.style.width = w + 'px';
        ghost.style.height = self.view === 'month' ? '34px' : '54px';
        ghost.style.top = '6px';
      });

      zone.addEventListener('dragleave', function(e) {
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
          const ghost = zone.querySelector('.pl-ghost');
          if (ghost) ghost.remove();
        }
      });

      zone.addEventListener('drop', async function(e) {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const ghost = zone.querySelector('.pl-ghost');
        if (ghost) ghost.remove();
        
        if (self.blockMode) return;

        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          const r = zone.getBoundingClientRect();
          const idx = Math.floor((e.clientX - r.left) / (r.width / self.config.cols.length));
          const col = self.config.cols[idx];
          if (!col) return;

          let newDate = data.date;
          let newHora = data.hora;
          
          if (self.view === 'day') {
            newHora = `${String(col.hour).padStart(2, '0')}:00`;
          } else {
            newDate = col.date;
          }

          const newEmpId = zone.dataset.id || null;
          const newEmpName = zone.dataset.name;

          // No hacer nada si no cambió
          if (newEmpName === data.name && newDate === data.date && newHora === data.hora) return;

          // Actualizar local
          const task = self.tasks.find(t => t.id === data.id);
          if (task) {
            task.empleado_id = newEmpId;
            task.empleado_nombre = newEmpName;
            task.fecha = newDate;
            task.hora = newHora;
          }

          self.refreshUI();
          self.toast('Guardando...');

          // Guardar en Supabase
          await update(TBL.servicios, data.id, {
            empleado_id: newEmpId,
            fecha_servicio: newDate,
            hora_inicio: newHora
          });

          // Recargar datos
          await loadAll();
          self.loadCleaners();
          await self.loadData();
          self.refreshUI();
          
          self.toast('✓ Guardado');
        } catch (err) {
          console.error('Drop error:', err);
          self.toast('Error al guardar', true);
        }
      });
    });
  }

  setupResize(handle, bar, taskId, colWidthPct) {
    const self = this;
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const startX = e.clientX;
      const startWidth = bar.getBoundingClientRect().width;
      const parentWidth = bar.parentElement.getBoundingClientRect().width;
      
      const onMove = function(me) {
        const newWidth = startWidth + (me.clientX - startX);
        if (newWidth > 30) bar.style.width = newWidth + 'px';
      };
      
      const onUp = async function() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        
        const finalWidth = bar.getBoundingClientRect().width;
        const pct = (finalWidth / parentWidth) * 100;
        const hours = pct / colWidthPct;
        const minutes = Math.round(hours * 60);
        
        // Actualizar local
        const task = self.tasks.find(t => t.id === taskId);
        if (task) task.duracion = minutes;
        
        self.toast('Guardando...');
        
        try {
          await update(TBL.servicios, taskId, { duracion_minutos: minutes });
          self.toast('✓ Duración actualizada');
        } catch (err) {
          self.toast('Error', true);
        }
      };
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  openAssignModal(currentId) {
    const list = document.getElementById('pl-cleaner-list');
    const available = this.cleaners.filter(c => c.id);
    
    if (available.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:#6b7280; padding:20px;">No hay empleados disponibles. Crea empleados primero.</p>';
    } else {
      list.innerHTML = available.map(c => `
        <label class="pl-opt">
          <input type="radio" name="pl-cleaner" value="${c.id}" ${c.id === currentId ? 'checked' : ''}>
          <span style="flex:1; font-weight:600;">${c.name}</span>
          ${c.type === 'Fijo' ? '<span class="pl-tag fijo">Fijo</span>' : '<span class="pl-tag">Externo</span>'}
          ${c.rating ? `<span class="pl-tag star">★${c.rating}</span>` : ''}
        </label>
      `).join('');
    }
    this.els.modal.classList.add('open');
  }

  async saveAssignments() {
    const selected = document.querySelector('input[name="pl-cleaner"]:checked');
    const newId = selected?.value || null;
    
    this.els.modal.classList.remove('open');
    
    if (!this.editingId) return;
    
    const emp = this.cleaners.find(c => c.id === newId);
    const task = this.tasks.find(t => t.id === this.editingId);
    
    if (task) {
      task.empleado_id = newId;
      task.empleado_nombre = emp?.name || 'Sin Asignar';
    }
    
    this.refreshUI();
    this.toast('Guardando...');
    
    try {
      await update(TBL.servicios, this.editingId, { empleado_id: newId });
      await loadAll();
      this.toast('✓ Guardado');
    } catch (err) {
      this.toast('Error al guardar', true);
    }
  }

  async unassignAll() {
    if (!confirm('⚠️ ¿Desasignar todos los servicios visibles?')) return;
    
    this.toast('🧹 Limpiando...');
    let count = 0;
    
    for (const t of this.tasks) {
      if (t.empleado_id) {
        t.empleado_id = null;
        t.empleado_nombre = 'Sin Asignar';
        await update(TBL.servicios, t.id, { empleado_id: null });
        count++;
      }
    }
    
    await loadAll();
    this.loadCleaners();
    await this.loadData();
    this.refreshUI();
    this.toast(`🗑️ ${count} servicios desasignados`);
  }

  async runFastOptimize() {
    this.toast('⚡ Optimizando...');
    
    const unassigned = this.tasks.filter(t => !t.empleado_id);
    if (unassigned.length === 0) {
      this.toast('No hay tareas sin asignar');
      return;
    }
    
    const available = this.cleaners.filter(c => c.id && c.type === 'Fijo');
    const externos = this.cleaners.filter(c => c.id && c.type !== 'Fijo');
    const pool = [...available, ...externos];
    
    if (pool.length === 0) {
      this.toast('No hay empleados disponibles', true);
      return;
    }
    
    let assigned = 0;
    for (const t of unassigned) {
      const emp = pool[assigned % pool.length];
      t.empleado_id = emp.id;
      t.empleado_nombre = emp.name;
      await update(TBL.servicios, t.id, { empleado_id: emp.id });
      assigned++;
    }
    
    await loadAll();
    this.loadCleaners();
    await this.loadData();
    this.refreshUI();
    this.toast(`✅ ${assigned} tareas asignadas`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIAR WHATSAPP A LIMPIADORES
  // ═══════════════════════════════════════════════════════════════════════════
  
  async sendToCleaners() {
    // Agrupar tareas por empleado
    const tasksByEmployee = {};
    
    this.tasks.forEach(t => {
      if (t.empleado_id) {
        if (!tasksByEmployee[t.empleado_id]) {
          tasksByEmployee[t.empleado_id] = {
            empleado_id: t.empleado_id,
            empleado_nombre: t.empleado_nombre || 'Sin nombre',
            tasks: []
          };
        }
        tasksByEmployee[t.empleado_id].tasks.push(t);
      }
    });
    
    const empleadosConTareas = Object.values(tasksByEmployee);
    
    if (empleadosConTareas.length === 0) {
      this.toast('No hay tareas asignadas para enviar', true);
      return;
    }
    
    // Obtener teléfonos de empleados
    const cleanersWithPhone = this.cleaners.filter(c => c.id && c.phone);
    const phoneMap = {};
    cleanersWithPhone.forEach(c => {
      phoneMap[c.id] = c.phone.replace(/\D/g, ''); // Solo números
    });
    
    // Confirmar envío
    const sinTelefono = empleadosConTareas.filter(e => !phoneMap[e.empleado_id]);
    let confirmMsg = `📲 Enviar WhatsApp a ${empleadosConTareas.length} limpiador(es)?\n\n`;
    
    empleadosConTareas.forEach(e => {
      const phone = phoneMap[e.empleado_id];
      confirmMsg += `• ${e.empleado_nombre}: ${e.tasks.length} servicio(s) ${phone ? '✅' : '❌ sin teléfono'}\n`;
    });
    
    if (sinTelefono.length > 0) {
      confirmMsg += `\n⚠️ ${sinTelefono.length} empleado(s) sin teléfono registrado`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    // Preparar vista actual
    const viewName = this.view === 'day' ? 'día' : (this.view === 'week' ? 'semana' : 'mes');
    const dateStr = this.formatDateRange();
    
    this.toast('📤 Enviando mensajes...');
    
    let enviados = 0;
    let errores = 0;
    
    for (const emp of empleadosConTareas) {
      const phone = phoneMap[emp.empleado_id];
      if (!phone) continue;
      
      // Construir mensaje
      const message = this.buildMessageForCleaner(emp, viewName, dateStr);
      
      try {
        const response = await fetch('https://app.builderbot.cloud/api/v2/62268a68-ccd0-49e6-998e-f75ae75498d8/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-builderbot': 'bb-8773bbe1-5116-422d-b891-80795a4f6358'
          },
          body: JSON.stringify({
            messages: {
              content: message
            },
            number: phone,
            checkIfExists: false
          })
        });
        
        if (response.ok) {
          enviados++;
          console.log(`✅ Mensaje enviado a ${emp.empleado_nombre} (${phone})`);
        } else {
          errores++;
          console.error(`❌ Error enviando a ${emp.empleado_nombre}:`, await response.text());
        }
      } catch (err) {
        errores++;
        console.error(`❌ Error enviando a ${emp.empleado_nombre}:`, err);
      }
      
      // Pequeña pausa entre mensajes para no saturar la API
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (errores > 0) {
      this.toast(`📲 Enviados: ${enviados} | Errores: ${errores}`, true);
    } else {
      this.toast(`✅ ${enviados} mensaje(s) enviado(s)`);
    }
  }
  
  formatDateRange() {
    const d = this.date instanceof Date ? this.date : new Date();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (this.view === 'day') {
      return `${dayNames[d.getDay()]} ${d.getDate()} de ${monthNames[d.getMonth()]}`;
    } else if (this.view === 'week') {
      const start = new Date(d);
      // Lunes como inicio de semana
      const day = start.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start.setDate(start.getDate() + diffToMonday);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      // Si cruza de mes, mostramos ambos meses para claridad
      if (start.getMonth() !== end.getMonth()) {
        return `${start.getDate()} ${monthNames[start.getMonth()].slice(0,3)} - ${end.getDate()} ${monthNames[end.getMonth()].slice(0,3)}`;
      }

      return `${start.getDate()}-${end.getDate()} de ${monthNames[start.getMonth()]}`;
    } else {
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  buildMessageForCleaner(emp, viewName, dateStr) {
    let msg = `🏠 *SERVICIOS ASIGNADOS*\n`;
    msg += `📅 ${dateStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `👤 *${emp.empleado_nombre}*\n\n`;
    
    // Ordenar tareas por fecha y hora
    const sortedTasks = [...emp.tasks].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.hora || '00:00').localeCompare(b.hora || '00:00');
    });
    
    // Agrupar por fecha
    const byDate = {};
    sortedTasks.forEach(t => {
      if (!byDate[t.date]) byDate[t.date] = [];
      byDate[t.date].push(t);
    });
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    Object.entries(byDate).forEach(([date, tasks]) => {
      const d = new Date(date + 'T12:00:00');
      msg += `📆 *${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}*\n`;
      
      tasks.forEach(t => {
        const hora = t.hora ? `⏰ ${t.hora.substring(0, 5)}` : '';
        const duracion = t.duracion ? ` (${Math.floor(t.duracion / 60)}h${t.duracion % 60 ? t.duracion % 60 + 'm' : ''})` : '';
        const tipo = t.tipo === 'checkout' ? '🔴' : (t.tipo === 'checkin' ? '🟢' : '🔵');
        
        msg += `${tipo} ${t.property}${hora ? ' ' + hora : ''}${duracion}\n`;
        
        // Añadir dirección si existe
        if (t.direccion) {
          msg += `   📍 ${t.direccion}\n`;
        }
      });
      msg += `\n`;
    });
    
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Total: ${emp.tasks.length} servicio(s)\n`;
    msg += `\n_Mensaje automático de CleanManager_`;
    
    return msg;
  }

  async runAutoAssign() {
    this.els.aiModal.classList.remove('open');
    
    const wFixed = parseInt(document.getElementById('pl-r-fixed').value) / 100;
    const wRating = parseInt(document.getElementById('pl-r-rating').value) / 100;
    const wLoad = parseInt(document.getElementById('pl-r-load').value) / 100;
    const limit15 = document.getElementById('pl-ai-finish-15').checked;
    
    this.toast('🤖 Optimizando...');
    
    const unassigned = this.tasks.filter(t => !t.empleado_id);
    if (unassigned.length === 0) {
      this.toast('No hay tareas sin asignar');
      return;
    }
    
    const available = this.cleaners.filter(c => c.id);
    if (available.length === 0) {
      this.toast('No hay empleados disponibles', true);
      return;
    }
    
    // Calcular carga actual
    const load = {};
    available.forEach(c => load[c.id] = 0);
    this.tasks.filter(t => t.empleado_id).forEach(t => {
      if (load[t.empleado_id] !== undefined) load[t.empleado_id] += t.duracion;
    });
    
    let assigned = 0;
    for (const t of unassigned) {
      // Filtrar por hora si limit15
      if (limit15) {
        const [hh] = (t.hora || '10:00').split(':').map(Number);
        const endH = hh + t.duracion / 60;
        if (endH > 15) continue;
      }
      
      // Puntuar candidatos
      const scored = available.map(c => {
        let score = 50;
        score += c.type === 'Fijo' ? 100 * wFixed : 0;
        score += (c.rating || 3) * 20 * wRating;
        const loadRatio = (load[c.id] || 0) / (c.maxHours * 60);
        score -= loadRatio * 100 * wLoad;
        return { ...c, score };
      }).sort((a, b) => b.score - a.score);
      
      const winner = scored[0];
      t.empleado_id = winner.id;
      t.empleado_nombre = winner.name;
      load[winner.id] += t.duracion;
      
      await update(TBL.servicios, t.id, { empleado_id: winner.id });
      assigned++;
    }
    
    await loadAll();
    this.loadCleaners();
    await this.loadData();
    this.refreshUI();
    this.toast(`✅ ${assigned} tareas asignadas`);
  }

  toast(msg, isError = false) {
    this.els.toast.innerText = msg;
    this.els.toast.style.background = isError ? '#ef4444' : '#1f2937';
    this.els.toast.classList.add('show');
    setTimeout(() => this.els.toast.classList.remove('show'), 3000);
  }
}