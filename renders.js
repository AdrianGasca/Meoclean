// ===============================================
// RENDERS - Todas las funciones de renderizado
// ===============================================
// ===== RENDERS =====
function renderDashboard() {
  const hoy = new Date().toISOString().split('T')[0];
  const servHoy = S.servicios.filter(s => s.fecha_servicio === hoy);
  const pendientes = S.servicios.filter(s => s.estado === 'pendiente' || s.estado === 'confirmado');
  const stockBajo = S.inventario.filter(i => i.stock < i.stock_minimo);
  
  $('#stat-hoy').textContent = servHoy.length;
  $('#stat-pendientes').textContent = pendientes.length;
  $('#stat-props').textContent = S.propiedades.length;
  $('#stat-stock-bajo').textContent = stockBajo.length;
  
  // Badge
  if (pendientes.length) {
    $('#servicios-badge').style.display = 'inline';
    $('#servicios-badge').textContent = pendientes.length;
  } else {
    $('#servicios-badge').style.display = 'none';
  }
  
  if (stockBajo.length) {
    $('#stock-alert-badge').style.display = 'inline';
    $('#stock-alert-badge').textContent = stockBajo.length;
  } else {
    $('#stock-alert-badge').style.display = 'none';
  }
  
  // Próximos servicios
  const proximos = S.servicios.filter(s => s.fecha_servicio >= hoy && s.estado !== 'completado' && s.estado !== 'cancelado').sort((a,b) => a.fecha_servicio.localeCompare(b.fecha_servicio)).slice(0, 5);
  
  $('#dash-servicios').innerHTML = proximos.length ? proximos.map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:600;">${s.propiedad_nombre}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${formatDate(s.fecha_servicio)} ${s.hora_inicio || ''}</div>
      </div>
      <span class="badge ${estadoBadge(s.estado)}">${s.estado}</span>
    </div>
  `).join('') : '<p style="color:var(--text-muted); text-align:center; padding:20px;">Sin servicios próximos</p>';
  
  // Alertas
  let alertas = [];
  if (stockBajo.length) alertas.push(`⚠️ ${stockBajo.length} artículos con stock bajo`);
  const mantPend = S.mantenimiento.filter(m => m.estado === 'pendiente');
  if (mantPend.length) alertas.push(`🔧 ${mantPend.length} incidencias pendientes`);
  
  $('#dash-alertas').innerHTML = alertas.length ? alertas.map(a => `<div style="padding:10px 0; border-bottom:1px solid var(--border);">${a}</div>`).join('') : '<p style="color:var(--text-muted); text-align:center; padding:20px;">✓ Todo en orden</p>';
}

function renderServicios() {
  const fecha = $('#serv-fecha').value;
  const estado = $('#serv-estado').value;
  const prop = $('#serv-propiedad').value;
  
  let list = S.servicios;
  if (fecha) list = list.filter(s => s.fecha_servicio === fecha);
  if (estado) list = list.filter(s => s.estado === estado);
  if (prop) list = list.filter(s => s.propiedad_nombre === prop);
  
  list.sort((a, b) => b.fecha_servicio.localeCompare(a.fecha_servicio));
  
  const formatDuracion = (min) => {
    if (!min) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  };
  
  $('#servicios-tbody').innerHTML = list.length ? list.map(s => `
    <tr>
      <td>${formatDate(s.fecha_servicio)}</td>
      <td>${s.hora_inicio || '-'} <span style="color:var(--text-muted); font-size:0.8em;">${formatDuracion(s.duracion_minutos)}</span></td>
      <td><strong>${s.propiedad_nombre}</strong></td>
      <td><span class="badge badge-neutral">${s.tipo_servicio || 'checkout'}</span></td>
      <td>${s.huesped_nombre || '-'}</td>
      <td>${s.empleado_nombre || '<span style="color:var(--text-muted)">Sin asignar</span>'}</td>
      <td><span class="badge ${estadoBadge(s.estado)}">${s.estado}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editServicio('${s.id}')">✏️</button>
        ${s.estado !== 'completado' ? `<button class="btn btn-sm btn-success" onclick="completarServicio('${s.id}')">✓</button>` : ''}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">Sin servicios</td></tr>';
}

function renderReservas() {
  const tbody = $('#reservas-tbody');
  const emptyEl = $('#reservas-empty');
  
  // Filtros
  const desde = $('#res-desde').value;
  const hasta = $('#res-hasta').value;
  const origen = $('#res-origen').value;
  const status = $('#res-status').value;
  
  let filtered = [...S.reservas];
  
  if (desde) filtered = filtered.filter(r => r.check_in >= desde);
  if (hasta) filtered = filtered.filter(r => r.check_in <= hasta);
  if (origen) filtered = filtered.filter(r => r.origen === origen);
  if (status) filtered = filtered.filter(r => r.status === status);
  
  // Ordenar por check_in
  filtered.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));
  
  if (!filtered.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  
  emptyEl.style.display = 'none';
  
  const statusBadge = (s) => {
    if (s === 'confirmed') return 'badge-success';
    if (s === 'cancelled') return 'badge-danger';
    return 'badge-warning';
  };
  
  const statusText = (s) => {
    if (s === 'confirmed') return '✅ Confirmada';
    if (s === 'cancelled') return '❌ Cancelada';
    return '⏳ Pendiente';
  };
  
  const canalIcon = (origen, partner) => {
    if (partner?.toLowerCase().includes('airbnb')) return '🏠 Airbnb';
    if (partner?.toLowerCase().includes('booking')) return '🅱️ Booking';
    if (origen === 'avaibook') return '📗 Avaibook';
    if (origen === 'icnea') return '📘 Icnea';
    return partner || origen || 'Directo';
  };
  
  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td><strong>${formatDate(r.check_in)}</strong></td>
      <td>${formatDate(r.check_out)}</td>
      <td>${r.propiedad_nombre || '<span style="color:var(--text-muted)">Sin asignar</span>'}</td>
      <td>
        <div>${r.huesped_nombre || 'Huésped'}</div>
        <small style="color:var(--text-muted)">${r.huesped_email || ''}</small>
      </td>
      <td>${r.num_huespedes || '-'} (${r.num_adultos || 0}A/${r.num_ninos || 0}N)</td>
      <td>${canalIcon(r.origen, r.partner_name)}</td>
      <td><span class="badge ${statusBadge(r.status)}">${statusText(r.status)}</span></td>
      <td><strong>${r.precio ? r.precio.toFixed(2) + '€' : '-'}</strong></td>
    </tr>
  `).join('');
}

async function syncAllReservas() {
  toast('Sincronizando reservas de todos los PMS...');
  
  const plataformas = [...new Set(S.credenciales.filter(c => c.activo).map(c => c.plataforma))];
  
  for (const plataforma of plataformas) {
    await syncReservas(plataforma);
  }
  
  await loadAll();
  renderReservas();
  toast('✅ Sincronización completada');
}
function renderKits() {
  const consumoLabels = {
    'servicio': '🧹 Cada Servicio',
    'checkout': '🔴 Checkout',
    'checkin': '🟢 Check-in',
    'manual': '✋ Manual'
  };
  
  $('#kits-grid').innerHTML = S.kits.length ? S.kits.map(k => {
    const productos = k.productos || [];
    const numProductos = Array.isArray(productos) ? productos.length : 0;
    const consumoTipo = k.consumo_tipo || 'servicio';
    const propTipo = k.propiedades_tipo || 'todas';
    
    return `
    <div class="item-card" style="cursor:pointer;" onclick="editKit('${k.id}')">
      <div class="item-card-header">
        <div class="item-card-title">🎁 ${k.nombre}</div>
        <span class="badge badge-accent">${consumoLabels[consumoTipo] || consumoTipo}</span>
      </div>
      <div class="item-card-meta" style="display:flex; flex-direction:column; gap:4px;">
        ${k.descripcion ? `<span>${k.descripcion}</span>` : ''}
        <span>📦 ${numProductos} producto${numProductos !== 1 ? 's' : ''}</span>
        <span>${propTipo === 'todas' ? '🏠 Todas las propiedades' : '📍 Propiedades específicas'}</span>
      </div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editKit('${k.id}')">✏️ Editar</button>
        <button class="btn btn-sm" style="background:#fee2e2; color:#b91c1c;" onclick="event.stopPropagation(); deleteKit('${k.id}')">🗑️</button>
      </div>
    </div>
  `}).join('') : empty('🎁', 'Sin kits configurados');
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPIEDADES - FUNCIONES MEJORADAS
// ═══════════════════════════════════════════════════════════════════════════

function switchPropTab(tab) {
  const listTab = $('#props-tab-list');
  const timesTab = $('#props-tab-times');
  const btnList = $('#tab-props-list');
  const btnTimes = $('#tab-props-times');
  
  if (tab === 'list') {
    listTab.style.display = 'block';
    timesTab.style.display = 'none';
    btnList.style.background = 'var(--primary)';
    btnList.style.color = 'white';
    btnList.classList.remove('btn-secondary');
    btnTimes.style.background = '';
    btnTimes.style.color = '';
    btnTimes.classList.add('btn-secondary');
    renderPropiedades();
  } else {
    listTab.style.display = 'none';
    timesTab.style.display = 'block';
    btnTimes.style.background = 'var(--primary)';
    btnTimes.style.color = 'white';
    btnTimes.classList.remove('btn-secondary');
    btnList.style.background = '';
    btnList.style.color = '';
    btnList.classList.add('btn-secondary');
    propTiempos.render();
  }
}

function renderPropiedades() {
  const search = ($('#props-search')?.value || '').toLowerCase();
  const sourceFilter = $('#props-filter-source')?.value || '';
  
  // Combinar propiedades de config + integración (si hay)
  let allProps = [...(S.propiedades || [])];
  
  // Filtrar
  let filtered = allProps.filter(p => {
    const name = (p.propiedad_nombre || p.nombre || '').toLowerCase();
    if (search && !name.includes(search)) return false;
    
    const isManual = p.source === 'manual' || !p.external_id;
    if (sourceFilter === 'manual' && !isManual) return false;
    if (sourceFilter === 'integration' && isManual) return false;
    
    return true;
  });
  
  if (filtered.length === 0) {
    $('#propiedades-grid').innerHTML = empty('🏠', 'Sin propiedades');
    return;
  }
  
  $('#propiedades-grid').innerHTML = filtered.map(p => {
    const nombre = p.propiedad_nombre || p.nombre || 'Sin nombre';
    const precio = p.precio_limpieza || 0;
    const tiempo = p.tiempo_limpieza || '-';
    const direccion = p.direccion || '';
    const habitaciones = p.habitaciones || p.total_rooms || 0;
    const banos = p.banos || p.total_bathrooms || 0;
    const isManual = p.source === 'manual' || !p.external_id;
    const sourceIcon = isManual ? '📝' : '🔗';
    const sourceBadge = isManual 
      ? '<span class="badge badge-neutral">Manual</span>' 
      : '<span class="badge" style="background:#dbeafe;color:#1e40af;">Integración</span>';
    
    return `
    <div class="item-card" style="cursor:pointer;" onclick="editPropiedad('${p.id}')">
      <div class="item-card-header">
        <div class="item-card-title">${sourceIcon} ${nombre}</div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${sourceBadge}
          <span class="badge badge-success">${precio}€</span>
        </div>
      </div>
      <div class="item-card-meta" style="display:flex; flex-direction:column; gap:4px;">
        ${direccion ? `<span>📍 ${direccion}</span>` : ''}
        <span>🛏️ ${habitaciones} hab · 🚿 ${banos} baños · ⏱️ ${tiempo} min</span>
      </div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editPropiedad('${p.id}')">✏️ Editar</button>
        ${isManual ? `<button class="btn btn-sm" style="background:#fee2e2; color:#b91c1c;" onclick="event.stopPropagation(); deletePropiedad('${p.id}')">🗑️</button>` : ''}
      </div>
    </div>
  `}).join('');
}

function newPropiedad() {
  $('#prop-edit-id').value = '';
  $('#prop-source').value = 'manual';
  $('#prop-modal-title').textContent = '🏠 Nueva Propiedad';
  $('#prop-nombre').value = '';
  $('#prop-direccion').value = '';
  $('#prop-habitaciones').value = '1';
  $('#prop-banos').value = '1';
  $('#prop-precio').value = '45';
  $('#prop-tiempo').value = '90';
  $('#prop-propietario').value = '';
  $('#prop-notas').value = '';
  
  // Poblar propietarios
  const propSelect = $('#prop-propietario');
  propSelect.innerHTML = '<option value="">Sin asignar</option>' + 
    (S.propietarios || []).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  
  openModal('modal-propiedad');
}

function editPropiedad(id) {
  // Comparación flexible de ID (puede ser número o string)
  const prop = S.propiedades.find(p => String(p.id) === String(id));
  if (!prop) {
    console.error('Propiedad no encontrada, ID:', id, 'Propiedades:', S.propiedades.map(p => p.id));
    return toast('Propiedad no encontrada', 'error');
  }
  
  const isManual = prop.source === 'manual' || !prop.external_id;
  
  $('#prop-edit-id').value = id;
  $('#prop-source').value = isManual ? 'manual' : 'integration';
  $('#prop-modal-title').textContent = '🏠 Editar Propiedad';
  $('#prop-nombre').value = prop.propiedad_nombre || prop.nombre || '';
  $('#prop-direccion').value = prop.direccion || '';
  $('#prop-habitaciones').value = prop.habitaciones || prop.total_rooms || 1;
  $('#prop-banos').value = prop.banos || prop.total_bathrooms || 1;
  $('#prop-precio').value = prop.precio_limpieza || 45;
  $('#prop-tiempo').value = prop.tiempo_limpieza || 90;
  $('#prop-propietario').value = prop.propietario_id || '';
  $('#prop-notas').value = prop.notas || '';
  
  // Poblar propietarios
  const propSelect = $('#prop-propietario');
  propSelect.innerHTML = '<option value="">Sin asignar</option>' + 
    (S.propietarios || []).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  if (prop.propietario_id) propSelect.value = prop.propietario_id;
  
  // Si es de integración, deshabilitar nombre
  $('#prop-nombre').disabled = !isManual;
  
  openModal('modal-propiedad');
}

async function deletePropiedad(id) {
  if (!confirm('¿Eliminar esta propiedad?')) return;
  
  try {
    await remove(TBL.propiedades, id);
    await loadAll();
    renderPropiedades();
    toast('Propiedad eliminada');
  } catch (e) {
    toast('Error al eliminar', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIEMPOS DE LIMPIEZA POR TIPOLOGÍA
// ═══════════════════════════════════════════════════════════════════════════

const propTiempos = {
  modifiedIds: new Set(),
  savedIds: new Set(),
  originalValues: {},
  
  render() {
    this.renderTipologias();
    this.renderList();
    this.populateFilters();
  },
  
  getTipologias() {
    const grupos = {};
    (S.propiedades || []).forEach(p => {
      const rooms = p.habitaciones || p.total_rooms || 0;
      const baths = p.banos || p.total_bathrooms || 0;
      const key = `${rooms}-${baths}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(p);
      
      // Guardar valor original
      if (this.originalValues[p.id] === undefined) {
        this.originalValues[p.id] = p.tiempo_limpieza || null;
      }
    });
    return grupos;
  },
  
  renderTipologias() {
    const container = $('#tipologias-grid');
    if (!container) return;
    
    const tipologias = this.getTipologias();
    const keys = Object.keys(tipologias).sort((a, b) => {
      const [rA, bA] = a.split('-').map(Number);
      const [rB, bB] = b.split('-').map(Number);
      return rA !== rB ? rA - rB : bA - bB;
    });
    
    if (keys.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);">No hay propiedades</p>';
      return;
    }
    
    container.innerHTML = keys.map(key => {
      const [rooms, baths] = key.split('-');
      const count = tipologias[key].length;
      return `
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:12px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:600;">🛏️ ${rooms} + 🚿 ${baths}</span>
            <span style="font-size:0.8rem; color:var(--text-muted);">${count} props</span>
          </div>
          <div style="display:flex; gap:8px;">
            <input type="number" id="tipo-${key}" class="form-input" placeholder="min" min="15" step="15" style="width:80px;">
            <button class="btn btn-sm btn-primary" onclick="propTiempos.applyToTipo('${key}')">Aplicar</button>
          </div>
        </div>
      `;
    }).join('');
  },
  
  applyToTipo(key) {
    const input = $(`#tipo-${key}`);
    const value = parseInt(input.value);
    const [targetRooms, targetBaths] = key.split('-').map(Number);
    
    if (!value || value < 15) {
      toast('Tiempo mínimo: 15 minutos', 'error');
      return;
    }
    
    let count = 0;
    S.propiedades.forEach(p => {
      const rooms = p.habitaciones || p.total_rooms || 0;
      const baths = p.banos || p.total_bathrooms || 0;
      
      if (rooms === targetRooms && baths === targetBaths) {
        p.tiempo_limpieza = value;
        this.modifiedIds.add(p.id);
        this.savedIds.delete(p.id);
        count++;
      }
    });
    
    this.renderList();
    toast(`✅ ${value} min aplicado a ${count} propiedades`);
    input.value = '';
  },
  
  renderList() {
    const container = $('#times-list');
    if (!container) return;
    
    const search = ($('#times-search')?.value || '').toLowerCase();
    const tipoFilter = $('#times-filter-tipo')?.value || '';
    
    let filtered = (S.propiedades || []).filter(p => {
      const name = (p.propiedad_nombre || p.nombre || '').toLowerCase();
      if (search && !name.includes(search)) return false;
      
      if (tipoFilter) {
        const rooms = p.habitaciones || p.total_rooms || 0;
        const baths = p.banos || p.total_bathrooms || 0;
        if (`${rooms}-${baths}` !== tipoFilter) return false;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">No hay propiedades</p>';
      return;
    }
    
    container.innerHTML = filtered.map(p => {
      const nombre = p.propiedad_nombre || p.nombre || 'Sin nombre';
      const rooms = p.habitaciones || p.total_rooms || 0;
      const baths = p.banos || p.total_bathrooms || 0;
      const tiempo = p.tiempo_limpieza || '';
      const isModified = this.modifiedIds.has(p.id);
      const isSaved = this.savedIds.has(p.id);
      
      let statusHtml = '<span style="color:var(--text-muted);">—</span>';
      let rowStyle = '';
      if (isSaved) {
        statusHtml = '<span style="color:#10b981;">✅</span>';
        rowStyle = 'background:#ecfdf5;';
      } else if (isModified) {
        statusHtml = '<span style="color:#f59e0b;">⏳</span>';
        rowStyle = 'background:#fffbeb;';
      }
      
      return `
        <div style="display:grid; grid-template-columns:1fr 100px 100px 80px 80px; gap:8px; padding:10px 12px; border-bottom:1px solid var(--border); align-items:center; ${rowStyle}">
          <span style="font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${nombre}</span>
          <span style="text-align:center;">🛏️ ${rooms}</span>
          <span style="text-align:center;">🚿 ${baths}</span>
          <input type="number" class="form-input" value="${tiempo}" placeholder="—" min="15" step="15" 
                 style="text-align:center; padding:6px;" onchange="propTiempos.updateProp('${p.id}', this.value)">
          <div style="text-align:center;">${statusHtml}</div>
        </div>
      `;
    }).join('');
  },
  
  filter() {
    this.renderList();
  },
  
  populateFilters() {
    const select = $('#times-filter-tipo');
    if (!select) return;
    
    const tipologias = this.getTipologias();
    const keys = Object.keys(tipologias).sort((a, b) => {
      const [rA, bA] = a.split('-').map(Number);
      const [rB, bB] = b.split('-').map(Number);
      return rA !== rB ? rA - rB : bA - bB;
    });
    
    select.innerHTML = '<option value="">Todas las tipologías</option>' +
      keys.map(key => {
        const [rooms, baths] = key.split('-');
        const count = tipologias[key].length;
        return `<option value="${key}">🛏️ ${rooms} + 🚿 ${baths} (${count})</option>`;
      }).join('');
  },
  
  updateProp(id, value) {
    const prop = S.propiedades.find(p => p.id === id);
    if (!prop) return;
    
    const newValue = value ? parseInt(value) : null;
    prop.tiempo_limpieza = newValue;
    
    if (newValue != this.originalValues[id]) {
      this.modifiedIds.add(id);
      this.savedIds.delete(id);
    } else {
      this.modifiedIds.delete(id);
    }
    
    this.renderList();
  },
  
  resetChanges() {
    if (!confirm('¿Descartar todos los cambios no guardados?')) return;
    
    S.propiedades.forEach(p => {
      if (this.originalValues[p.id] !== undefined) {
        p.tiempo_limpieza = this.originalValues[p.id];
      }
    });
    this.modifiedIds.clear();
    this.savedIds.clear();
    this.renderList();
    toast('Cambios descartados');
  },
  
  async saveAll() {
    if (this.modifiedIds.size === 0) {
      toast('No hay cambios para guardar', 'error');
      return;
    }
    
    const btn = $('#btn-save-times');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Guardando...';
    }
    
    try {
      for (const id of this.modifiedIds) {
        const prop = S.propiedades.find(p => p.id === id);
        if (prop) {
          await update(TBL.propiedades, id, { tiempo_limpieza: prop.tiempo_limpieza });
          this.savedIds.add(id);
          this.originalValues[id] = prop.tiempo_limpieza;
        }
      }
      
      const count = this.modifiedIds.size;
      this.modifiedIds.clear();
      this.renderList();
      toast(`✅ ${count} propiedades actualizadas`);
      
    } catch (e) {
      console.error(e);
      toast('Error al guardar: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💾 Guardar Todo';
      }
    }
  }
};

function renderPropietarios() {
  $('#propietarios-grid').innerHTML = S.propietarios.length ? S.propietarios.map(p => `
    <div class="item-card">
      <div class="item-card-title">${p.nombre}</div>
      <div class="item-card-meta">${p.email || ''}<br>${p.telefono || ''}</div>
    </div>
  `).join('') : empty('👤', 'Sin propietarios');
}

function renderEmpleados() {
  $('#empleados-grid').innerHTML = S.empleados.length ? S.empleados.map(e => {
    const diasLibresStr = (e.dias_libres || []).map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][parseInt(d)]).join(', ');
    return `
    <div class="item-card" style="cursor:pointer;" onclick="editEmpleado('${e.id}')">
      <div class="item-card-header">
        <div class="item-card-title">${e.nombre}</div>
        <div style="display:flex; gap:6px; align-items:center;">
          ${e.tipo === 'Fijo' ? '<span class="badge" style="background:#dbeafe;color:#1e40af;">Fijo</span>' : '<span class="badge badge-neutral">Externo</span>'}
          <span class="badge ${e.activo ? 'badge-success' : 'badge-neutral'}">${e.activo ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>
      <div class="item-card-meta" style="display:flex; flex-direction:column; gap:4px;">
        ${e.email ? `<span>📧 ${e.email}</span>` : ''}
        ${e.telefono ? `<span>📱 ${e.telefono}</span>` : ''}
        <span>⭐ ${e.rating || 3} · ⏱ ${e.horas_maximas || 40}h/sem · 💶 ${e.precio_hora || 15}€/h</span>
        ${diasLibresStr ? `<span style="color:var(--text-muted);">🗓️ Libres: ${diasLibresStr}</span>` : ''}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editEmpleado('${e.id}')">✏️ Editar</button>
        <button class="btn btn-sm" style="background:#fee2e2; color:#b91c1c;" onclick="event.stopPropagation(); deleteEmpleado('${e.id}')">🗑️</button>
        <button class="btn btn-sm" onclick="event.stopPropagation(); toggleEmpleadoActivo('${e.id}', ${!e.activo})">${e.activo ? '⏸️ Desactivar' : '▶️ Activar'}</button>
      </div>
    </div>
  `}).join('') : empty('👥', 'Sin empleados');
}

function newEmpleado() {
  $('#emp-edit-id').value = '';
  $('#emp-nombre').value = '';
  $('#emp-email').value = '';
  $('#emp-telefono').value = '';
  $('#emp-rol').value = 'limpiador';
  $('#emp-tipo').value = 'Externo';
  $('#emp-rating').value = '3';
  $('#emp-horas').value = '40';
  $('#emp-precio').value = '15';
  for (let i = 0; i <= 6; i++) {
    const cb = $(`#emp-dia-${i}`);
    if (cb) cb.checked = false;
  }
  openModal('modal-empleado');
}

function editEmpleado(id) {
  const e = S.empleados.find(x => x.id === id);
  if (!e) return;
  
  $('#emp-edit-id').value = id;
  $('#emp-nombre').value = e.nombre || '';
  $('#emp-email').value = e.email || '';
  $('#emp-telefono').value = e.telefono || '';
  $('#emp-rol').value = e.rol || 'limpiador';
  $('#emp-tipo').value = e.tipo || 'Externo';
  $('#emp-rating').value = e.rating || 3;
  $('#emp-horas').value = e.horas_maximas || 40;
  $('#emp-precio').value = e.precio_hora || 15;
  
  // Limpiar checkboxes
  for (let i = 0; i <= 6; i++) {
    const cb = $(`#emp-dia-${i}`);
    if (cb) cb.checked = false;
  }
  // Marcar días libres
  (e.dias_libres || []).forEach(d => {
    const cb = $(`#emp-dia-${d}`);
    if (cb) cb.checked = true;
  });
  
  openModal('modal-empleado');
}

async function deleteEmpleado(id) {
  if (!confirm('¿Eliminar este empleado?')) return;
  await remove(TBL.empleados, id);
  await loadAll();
  renderEmpleados();
  initFilters();
  toast('Empleado eliminado');
}

async function toggleEmpleadoActivo(id, activo) {
  await update(TBL.empleados, id, { activo });
  await loadAll();
  renderEmpleados();
  initFilters();
  toast(activo ? 'Empleado activado' : 'Empleado desactivado');
}

function renderExtras() {
  const mes = $('#extras-mes').value;
  let list = S.extras;
  if (mes) list = list.filter(e => e.fecha?.startsWith(mes));
  
  $('#extras-tbody').innerHTML = list.length ? list.map(e => `
    <tr>
      <td>${formatDate(e.fecha)}</td>
      <td>${e.propiedad_nombre || ''}</td>
      <td>${e.concepto || ''}</td>
      <td><strong>${(e.importe || 0).toFixed(2)}€</strong></td>
      <td><button class="btn btn-sm btn-danger" onclick="delExtra(${e.id})">🗑</button></td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted);">Sin extras</td></tr>';
}

function renderMantenimiento() {
  const estado = $('#mant-estado').value;
  let list = S.mantenimiento;
  if (estado) list = list.filter(m => m.estado === estado);
  
  $('#mantenimiento-grid').innerHTML = list.length ? list.map(m => `
    <div class="item-card">
      <div class="item-card-header">
        <div class="item-card-title">${m.titulo}</div>
        <span class="badge ${m.estado === 'resuelto' ? 'badge-success' : 'badge-warning'}">${m.estado}</span>
      </div>
      <div class="item-card-meta">${m.propiedad_nombre || ''} · ${formatDate(m.fecha)}</div>
      ${m.importe ? `<div style="margin-top:8px; font-weight:700;">${m.importe.toFixed(2)}€</div>` : ''}
    </div>
  `).join('') : empty('🔧', 'Sin incidencias');
}

function renderGastos() {
  const mes = $('#gastos-mes').value;
  const tipo = $('#gastos-tipo').value;
  let list = S.gastos;
  if (mes) list = list.filter(g => g.fecha?.startsWith(mes));
  if (tipo) list = list.filter(g => g.tipo === tipo);
  
  const icons = { luz:'💡', agua:'💧', gas:'🔥', comunidad:'🏢', internet:'📶', otro:'📎' };
  
  $('#gastos-tbody').innerHTML = list.length ? list.map(g => `
    <tr>
      <td>${formatDate(g.fecha)}</td>
      <td>${g.propiedad_nombre || ''}</td>
      <td>${icons[g.tipo] || ''} ${g.tipo || ''}</td>
      <td>${g.concepto || ''}</td>
      <td><strong>${(g.importe || 0).toFixed(2)}€</strong></td>
      <td>${g.pagado_por || 'gestor'}</td>
      <td><button class="btn btn-sm btn-danger" onclick="delGasto(${g.id})">🗑</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">Sin gastos</td></tr>';
}

function renderAlertas() {
  const a = S.alertas || {};
  $('#alert-whatsapp').value = a.whatsapp_notificaciones || '';
  $('#alert-email').value = a.email_notificaciones || '';
  $('#alert-stock').checked = a.alerta_stock_bajo || false;
  $('#alert-semanal').checked = a.recordatorio_semanal || false;
  
  // Cargar config de localStorage
  loadAlertConfig();
  
  // Calcular forecasts y actualizar alertas
  calculateForecasts();
  updateAlertPreview();
  renderAlertasEstado();
}
