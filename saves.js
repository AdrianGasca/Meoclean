// ===============================================
// SAVES - Funciones de guardado (excepto stock)
// ===============================================
async function saveServicio() {
  const editId = $('#serv-edit-id').value;
  const propSel = $('#serv-propiedad-sel');
  const empSel = $('#serv-empleado');
  const empOpt = empSel.options[empSel.selectedIndex];
  
  // Buscar propiedad para obtener tiempo de limpieza y otros datos
  const propNombre = propSel.value;
  const prop = S.propiedades?.find(p => 
    (p.propiedad_nombre || p.nombre) === propNombre
  );
  
  // Duración: usar la del input, o la de la propiedad, o default 60
  let duracion = parseInt($('#serv-duracion')?.value) || 0;
  if (!duracion && prop) {
    duracion = prop.tiempo_limpieza || 60;
  }
  if (!duracion) duracion = 60;
  
  // Precio: usar el del input, o el de la propiedad
  let precio = parseFloat($('#serv-precio').value) || 0;
  if (!precio && prop) {
    precio = prop.precio_limpieza || 0;
  }
  
  const data = {
    cliente_email: S.clienteEmail,
    propiedad_nombre: propNombre,
    propiedad_id: prop?.id || null,
    tipo_servicio: $('#serv-tipo').value,
    fecha_servicio: $('#serv-fecha-input').value,
    hora_inicio: $('#serv-hora').value || null,
    duracion_minutos: duracion,
    check_in: $('#serv-checkin').value || null,
    check_out: $('#serv-checkout').value || null,
    huesped_nombre: $('#serv-huesped').value.trim() || null,
    num_huespedes: parseInt($('#serv-num-huespedes').value) || 2,
    empleado_id: empSel.value || null,
    empleado_nombre: empOpt?.text !== 'Sin asignar' ? empOpt?.text : null,
    precio: precio,
    estado: $('#serv-estado-sel').value,
    prioridad: $('#serv-prioridad').value,
    notas: $('#serv-notas').value.trim() || null
  };
  
  if (!data.propiedad_nombre || !data.fecha_servicio) return toast('Propiedad y fecha son obligatorios', 'error');
  
  closeModal('modal-servicio');
  
  try {
    if (editId) {
      await fetch(`${API}/supa/patch/${TBL.servicios}?id=eq.${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await fetch(`${API}/supa/create/${TBL.servicios}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    await loadAll();
    renderServicios();
    renderDashboard();
    toast(editId ? 'Servicio actualizado' : 'Servicio creado');
  } catch (e) { toast('Error', 'error'); }
}

async function savePropiedad() {
  const editId = $('#prop-edit-id')?.value;
  const source = $('#prop-source')?.value || 'manual';
  
  const data = {
    cliente_email: S.clienteEmail,
    propiedad_nombre: $('#prop-nombre').value.trim(),
    direccion: $('#prop-direccion').value.trim() || null,
    habitaciones: parseInt($('#prop-habitaciones').value) || 1,
    banos: parseInt($('#prop-banos').value) || 1,
    precio_limpieza: parseFloat($('#prop-precio').value) || 0,
    tiempo_limpieza: parseInt($('#prop-tiempo').value) || 90,
    propietario_id: $('#prop-propietario').value || null,
    notas: $('#prop-notas').value.trim() || null
  };
  
  if (!data.propiedad_nombre) return toast('Nombre obligatorio', 'error');
  
  closeModal('modal-propiedad');
  
  try {
    if (editId) {
      // Edición
      await update(TBL.propiedades, editId, data);
      toast('Propiedad actualizada');
    } else {
      // Creación
      await create(TBL.propiedades, data);
      toast('Propiedad creada');
    }
    
    await loadAll();
    renderPropiedades();
    renderDashboard();
    initFilters();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function savePropietario() {
  const data = {
    cliente_email: S.clienteEmail,
    nombre: $('#propiet-nombre').value.trim(),
    email: $('#propiet-email').value.trim(),
    telefono: $('#propiet-telefono').value.trim()
  };
  if (!data.nombre) return toast('Nombre obligatorio', 'error');
  
  closeModal('modal-propietario');
  await create(TBL.propietarios, data);
  await loadAll();
  renderPropietarios();
  toast('Propietario creado');
}

async function saveEmpleado() {
  // Obtener días libres seleccionados
  const diasLibres = [];
  for (let i = 0; i <= 6; i++) {
    if ($(`#emp-dia-${i}`)?.checked) diasLibres.push(i.toString());
  }
  
  const data = {
    email_host: S.clienteEmail,
    nombre: $('#emp-nombre').value.trim(),
    email: $('#emp-email').value.trim() || null,
    telefono: $('#emp-telefono').value.trim() || null,
    rol: $('#emp-rol').value,
    tipo: $('#emp-tipo').value,
    rating: parseFloat($('#emp-rating').value) || 3,
    horas_maximas: parseInt($('#emp-horas').value) || 40,
    precio_hora: parseFloat($('#emp-precio').value) || 15,
    dias_libres: diasLibres.length > 0 ? diasLibres : null,
    activo: true
  };
  if (!data.nombre) return toast('Nombre obligatorio', 'error');
  
  const editId = $('#emp-edit-id')?.value;
  closeModal('modal-empleado');
  
  if (editId) {
    await update(TBL.empleados, editId, data);
    toast('Empleado actualizado');
  } else {
    await create(TBL.empleados, data);
    toast('Empleado creado');
  }
  
  await loadAll();
  renderEmpleados();
  initFilters();
}

// ═══════════════════════════════════════════════════════════════════════════
// KITS - FUNCIONES COMPLETAS
// ═══════════════════════════════════════════════════════════════════════════

function newKit() {
  $('#kit-edit-id').value = '';
  $('#kit-modal-title').textContent = '🎁 Nuevo Kit';
  $('#kit-nombre').value = '';
  $('#kit-desc').value = '';
  $('#kit-consumo-tipo').value = 'servicio';
  $('#kit-propiedades-tipo').value = 'todas';
  $('#kit-propiedades-lista').style.display = 'none';
  
  populateKitProductos({});
  populateKitPropiedades([]);
  openModal('modal-kit');
}

function editKit(id) {
  const kit = S.kits.find(k => String(k.id) === String(id));
  if (!kit) return toast('Kit no encontrado', 'error');
  
  $('#kit-edit-id').value = id;
  $('#kit-modal-title').textContent = '🎁 Editar Kit';
  $('#kit-nombre').value = kit.nombre || '';
  $('#kit-desc').value = kit.descripcion || '';
  $('#kit-consumo-tipo').value = kit.consumo_tipo || 'servicio';
  $('#kit-propiedades-tipo').value = kit.propiedades_tipo || 'todas';
  
  // Mostrar/ocultar lista de propiedades
  if (kit.propiedades_tipo === 'especificas') {
    $('#kit-propiedades-lista').style.display = 'block';
  } else {
    $('#kit-propiedades-lista').style.display = 'none';
  }
  
  // Productos del kit: { "producto_id": cantidad, ... }
  const productosKit = kit.productos || {};
  populateKitProductos(productosKit);
  
  // Propiedades seleccionadas
  const propiedadesKit = kit.propiedades || [];
  populateKitPropiedades(propiedadesKit);
  
  openModal('modal-kit');
}

function populateKitProductos(productosKit) {
  const container = $('#kit-productos-lista');
  if (!container) return;
  
  if (!S.inventario || S.inventario.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No hay productos en inventario. Añade productos primero.</p>';
    return;
  }
  
  container.innerHTML = S.inventario.map(p => {
    const cantidad = productosKit[p.id] || 0;
    const nombre = p.item || p.nombre || 'Sin nombre';  // Campo correcto es 'item'
    return `
      <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border);">
        <input type="number" 
               class="form-input kit-prod-qty" 
               data-prod-id="${p.id}" 
               value="${cantidad}" 
               min="0" 
               step="1"
               style="width:70px; text-align:center;">
        <span style="flex:1;">${nombre}</span>
        <span style="color:var(--text-muted); font-size:0.8rem;">${p.unidad || 'ud'}</span>
      </div>
    `;
  }).join('');
}

function populateKitPropiedades(propiedadesSeleccionadas) {
  const container = $('#kit-propiedades-lista');
  if (!container) return;
  
  if (!S.propiedades || S.propiedades.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No hay propiedades configuradas.</p>';
    return;
  }
  
  container.innerHTML = S.propiedades.map(p => {
    const nombre = p.propiedad_nombre || p.nombre;
    const checked = propiedadesSeleccionadas.includes(String(p.id)) ? 'checked' : '';
    return `
      <label style="display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer;">
        <input type="checkbox" class="kit-prop-check" data-prop-id="${p.id}" ${checked}>
        <span>${nombre}</span>
      </label>
    `;
  }).join('');
}

function toggleKitPropiedades() {
  const tipo = $('#kit-propiedades-tipo').value;
  const lista = $('#kit-propiedades-lista');
  if (tipo === 'especificas') {
    lista.style.display = 'block';
    populateKitPropiedades([]);
  } else {
    lista.style.display = 'none';
  }
}

async function saveKit() {
  const editId = $('#kit-edit-id').value;
  const nombre = $('#kit-nombre').value.trim();
  
  if (!nombre) return toast('Nombre obligatorio', 'error');
  
  // Recoger productos con cantidad > 0
  const productos = {};
  document.querySelectorAll('.kit-prod-qty').forEach(input => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      productos[input.dataset.prodId] = qty;
    }
  });
  
  // Recoger propiedades seleccionadas
  const propiedadesTipo = $('#kit-propiedades-tipo').value;
  const propiedades = [];
  if (propiedadesTipo === 'especificas') {
    document.querySelectorAll('.kit-prop-check:checked').forEach(cb => {
      propiedades.push(cb.dataset.propId);
    });
  }
  
  const data = {
    cliente_email: S.clienteEmail,
    nombre: nombre,
    descripcion: $('#kit-desc').value.trim() || null,
    consumo_tipo: $('#kit-consumo-tipo').value,
    propiedades_tipo: propiedadesTipo,
    propiedades: propiedades.length > 0 ? propiedades : null,
    productos: Object.keys(productos).length > 0 ? productos : null
  };
  
  closeModal('modal-kit');
  
  try {
    if (editId) {
      await update(TBL.kits, editId, data);
      toast('Kit actualizado');
    } else {
      await create(TBL.kits, data);
      toast('Kit creado');
    }
    await loadAll();
    renderKits();
  } catch (e) {
    console.error(e);
    toast('Error al guardar kit', 'error');
  }
}

async function deleteKit(id) {
  if (!confirm('¿Eliminar este kit?')) return;
  
  try {
    await remove(TBL.kits, id);
    await loadAll();
    renderKits();
    toast('Kit eliminado');
  } catch (e) {
    toast('Error al eliminar', 'error');
  }
}

async function saveExtra() {
  const data = {
    cliente_email: S.clienteEmail,
    fecha: $('#extra-fecha').value,
    propiedad_nombre: $('#extra-prop').value,
    concepto: $('#extra-concepto').value.trim(),
    importe: parseFloat($('#extra-importe').value) || 0
  };
  if (!data.fecha || !data.propiedad_nombre || !data.concepto) return toast('Campos obligatorios', 'error');
  
  closeModal('modal-extra');
  await create(TBL.extras, data);
  await loadAll();
  renderExtras();
  toast('Extra añadido');
}

async function saveMantenimiento() {
  const data = {
    cliente_email: S.clienteEmail,
    fecha: $('#mant-fecha').value || new Date().toISOString().split('T')[0],
    propiedad_nombre: $('#mant-prop').value,
    titulo: $('#mant-titulo').value.trim(),
    descripcion: $('#mant-desc').value.trim(),
    importe: parseFloat($('#mant-importe').value) || 0,
    estado: $('#mant-estado-sel').value
  };
  if (!data.titulo || !data.propiedad_nombre) return toast('Título y propiedad obligatorios', 'error');
  
  closeModal('modal-mantenimiento');
  await create(TBL.mantenimiento, data);
  await loadAll();
  renderMantenimiento();
  renderDashboard();
  toast('Incidencia creada');
}

async function saveGasto() {
  const data = {
    cliente_email: S.clienteEmail,
    fecha: $('#gasto-fecha').value,
    propiedad_nombre: $('#gasto-prop').value,
    tipo: $('#gasto-tipo').value,
    concepto: $('#gasto-concepto').value.trim(),
    importe: parseFloat($('#gasto-importe').value) || 0
  };
  if (!data.fecha || !data.propiedad_nombre) return toast('Campos obligatorios', 'error');
  
  closeModal('modal-gasto');
  await create(TBL.gastos, data);
  await loadAll();
  renderGastos();
  toast('Gasto añadido');
}

async function saveAlertConfig() {
  const data = {
    cliente_email: S.clienteEmail,
    whatsapp_notificaciones: $('#alert-whatsapp').value.trim(),
    email_notificaciones: $('#alert-email').value.trim(),
    alerta_stock_bajo: $('#alert-stock').checked,
    recordatorio_semanal: $('#alert-semanal').checked
  };
  
  try {
    if (S.alertas?.id) {
      await fetch(`${API}/supa/patch/${TBL.alertas}?id=eq.${S.alertas.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      await create(TBL.alertas, data);
    }
    await loadAll();
    toast('Configuración guardada');
  } catch (e) { toast('Error', 'error'); }
}

// ===== ACTIONS =====
async function adjStock(id, delta) {
  const item = S.inventario.find(i => i.id === id);
  if (!item) return;
  const newStock = Math.max(0, item.stock + delta);
  
  await fetch(`${API}/supa/patch/${TBL.inventario}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock })
  });
  
  item.stock = newStock;
  renderStock();
  renderDashboard();
}

function editServicio(id) {
  const s = S.servicios.find(x => x.id === id);
  if (!s) return;
  
  $('#serv-edit-id').value = id;
  $('#serv-propiedad-sel').value = s.propiedad_nombre;
  $('#serv-tipo').value = s.tipo_servicio || 'checkout';
  $('#serv-fecha-input').value = s.fecha_servicio;
  $('#serv-hora').value = s.hora_inicio || '';
  $('#serv-duracion').value = s.duracion_minutos || '';
  $('#serv-checkin').value = s.check_in || '';
  $('#serv-checkout').value = s.check_out || '';
  $('#serv-huesped').value = s.huesped_nombre || '';
  $('#serv-num-huespedes').value = s.num_huespedes || 2;
  $('#serv-empleado').value = s.empleado_id || '';
  $('#serv-precio').value = s.precio || '';
  $('#serv-estado-sel').value = s.estado || 'pendiente';
  $('#serv-prioridad').value = s.prioridad || 'normal';
  $('#serv-notas').value = s.notas || '';
  
  openModal('modal-servicio');
}

// Limpiar modal de servicio para nuevo
function newServicio() {
  $('#serv-edit-id').value = '';
  $('#serv-propiedad-sel').value = '';
  $('#serv-tipo').value = 'checkout';
  $('#serv-fecha-input').value = new Date().toISOString().split('T')[0];
  $('#serv-hora').value = '11:00';
  $('#serv-duracion').value = '';
  $('#serv-checkin').value = '';
  $('#serv-checkout').value = '';
  $('#serv-huesped').value = '';
  $('#serv-num-huespedes').value = 2;
  $('#serv-empleado').value = '';
  $('#serv-precio').value = '';
  $('#serv-estado-sel').value = 'pendiente';
  $('#serv-prioridad').value = 'normal';
  $('#serv-notas').value = '';
  
  openModal('modal-servicio');
}

async function completarServicio(id) {
  if (!confirm('¿Marcar como completado?')) return;
  
  await fetch(`${API}/supa/patch/${TBL.servicios}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'completado', completado_at: new Date().toISOString() })
  });
  
  await loadAll();
  renderServicios();
  renderDashboard();
  toast('Servicio completado');
}

async function delExtra(id) {
  if (!confirm('¿Eliminar?')) return;
  await fetch(`${API}/supa/delete/${TBL.extras}?id=eq.${id}`, { method: 'DELETE' });
  await loadAll();
  renderExtras();
}

async function delGasto(id) {
  if (!confirm('¿Eliminar?')) return;
  await fetch(`${API}/supa/delete/${TBL.gastos}?id=eq.${id}`, { method: 'DELETE' });
  await loadAll();
  renderGastos();
}

