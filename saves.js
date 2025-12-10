// ===============================================
// GUARDADOS / MODALES / ACCIONES CRUD
// ===============================================

// Helpers
const $ = (sel) => document.querySelector(sel);

// -----------------------------------------------
// Empleados
// -----------------------------------------------
function newEmpleado() {
  $('#empleado-modal-title').textContent = 'Nuevo empleado';
  $('#empleado-nombre').value = '';
  $('#empleado-telefono').value = '';
  $('#empleado-tipo').value = 'interno';
  $('#empleado-dias_libres').value = '';
  $('#empleado-modal').classList.add('open');
  window.__editEmpleadoId = null;
}

function editEmpleado(id) {
  const e = (S.empleados || []).find(x => x.id == id);
  if (!e) return;

  $('#empleado-modal-title').textContent = 'Editar empleado';
  $('#empleado-nombre').value = e.nombre || '';
  $('#empleado-telefono').value = e.telefono || '';
  $('#empleado-tipo').value = e.tipo || 'interno';
  $('#empleado-dias_libres').value = (e.dias_libres || []).join(',');
  $('#empleado-modal').classList.add('open');
  window.__editEmpleadoId = e.id;
}

async function saveEmpleado() {
  const nombre = ($('#empleado-nombre').value || '').trim();
  const telefono = ($('#empleado-telefono').value || '').trim();
  const tipo = $('#empleado-tipo').value || 'interno';
  const diasInput = ($('#empleado-dias_libres').value || '').trim();

  if (!nombre) {
    toast('El nombre es obligatorio', 'error');
    return;
  }

  const dias_libres = diasInput
    ? diasInput.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  // Detectar campo owner según esquema real cargado
  const ownerField = (S.empleados && S.empleados.length > 0 && Object.prototype.hasOwnProperty.call(S.empleados[0], 'email_host'))
    ? 'email_host'
    : 'cliente_email';

  const data = {
    [ownerField]: S.clienteEmail,
    nombre,
    telefono,
    tipo,
    dias_libres,
    activo: true
  };

  try {
    if (window.__editEmpleadoId) {
      await update(TBL.empleados, window.__editEmpleadoId, data);
      toast('✅ Empleado actualizado', 'success');
    } else {
      await create(TBL.empleados, data);
      toast('✅ Empleado creado', 'success');
    }

    $('#empleado-modal').classList.remove('open');
    window.__editEmpleadoId = null;

    await loadAll();
    if (typeof renderEmpleados === 'function') renderEmpleados();
    if (typeof renderPlanificador === 'function') renderPlanificador();
  } catch (e) {
    console.error(e);
    toast('Error guardando empleado', 'error');
  }
}

async function toggleEmpleadoActivo(id) {
  const e = (S.empleados || []).find(x => x.id == id);
  if (!e) return;

  try {
    await update(TBL.empleados, e.id, { activo: !e.activo });
    await loadAll();
    if (typeof renderEmpleados === 'function') renderEmpleados();
    if (typeof renderPlanificador === 'function') renderPlanificador();
  } catch (err) {
    console.error(err);
    toast('Error actualizando empleado', 'error');
  }
}

// -----------------------------------------------
// Servicios
// -----------------------------------------------
function editServicio(id) {
  const s = (S.servicios || []).find(x => x.id == id);
  if (!s) return;

  $('#servicio-modal-title').textContent = 'Editar servicio';
  $('#serv-fecha').value = (s.fecha_servicio || '').slice(0, 10);
  $('#serv-tipo').value = s.tipo || 'normal';
  $('#serv-estado').value = s.estado || 'pendiente';

  const empSel = $('#serv-empleado');
  if (empSel) {
    empSel.innerHTML =
      '<option value="">Sin asignar</option>' +
      (S.empleados || []).filter(e => e.activo).map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
      ).join('');
    empSel.value = s.empleado_id || '';
  }

  $('#servicio-modal').classList.add('open');
  window.__editServicioId = s.id;
}

function newServicio() {
  $('#servicio-modal-title').textContent = 'Nuevo servicio';
  $('#serv-fecha').value = '';
  $('#serv-tipo').value = 'normal';
  $('#serv-estado').value = 'pendiente';

  const empSel = $('#serv-empleado');
  if (empSel) {
    empSel.innerHTML =
      '<option value="">Sin asignar</option>' +
      (S.empleados || []).filter(e => e.activo).map(e =>
        `<option value="${e.id}">${e.nombre}</option>`
      ).join('');
    empSel.value = '';
  }

  $('#servicio-modal').classList.add('open');
  window.__editServicioId = null;
}

async function saveServicio() {
  const fecha_servicio = ($('#serv-fecha').value || '').trim();
  const tipo = $('#serv-tipo').value || 'normal';
  const estado = $('#serv-estado').value || 'pendiente';
  const empleado_id = $('#serv-empleado')?.value ? Number($('#serv-empleado').value) : null;

  if (!fecha_servicio) {
    toast('Selecciona una fecha', 'error');
    return;
  }

  const data = {
    cliente_email: S.clienteEmail,
    fecha_servicio,
    tipo,
    estado,
    empleado_id
  };

  try {
    if (window.__editServicioId) {
      await patch(TBL.servicios, `?id=eq.${window.__editServicioId}`, data);
      toast('✅ Servicio actualizado', 'success');
    } else {
      await create(TBL.servicios, data);
      toast('✅ Servicio creado', 'success');
    }

    $('#servicio-modal').classList.remove('open');
    window.__editServicioId = null;
    await loadAll();

    if (typeof renderServicios === 'function') renderServicios();
    if (typeof renderPlanificador === 'function') renderPlanificador();
    if (typeof renderLimpiezasMes === 'function') renderLimpiezasMes();
  } catch (e) {
    console.error(e);
    toast('Error guardando servicio', 'error');
  }
}

// Exponer
window.newEmpleado = newEmpleado;
window.editEmpleado = editEmpleado;
window.saveEmpleado = saveEmpleado;
window.toggleEmpleadoActivo = toggleEmpleadoActivo;

window.newServicio = newServicio;
window.editServicio = editServicio;
window.saveServicio = saveServicio;
