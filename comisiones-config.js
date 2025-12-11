// ===============================================
// COMISIONES Y CONFIGURACIÓN DE RENTABILIDAD
// ===============================================

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZAR VISTA DE COMISIONES
// ═══════════════════════════════════════════════════════════════════════════

function renderComisiones() {
    renderComisionesLista();
    renderRepartoConfig();
    renderGastosRecurrentesConfig();
}

// Renderizar lista de comisiones por plataforma
function renderComisionesLista() {
    const tbody = document.getElementById('comisiones-tbody');
    if (!tbody) return;

    const comisiones = S.comisiones || [];

    if (comisiones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Sin comisiones configuradas. Haz clic en "+ Nueva Comisión" para añadir.</td></tr>';
        return;
    }

    tbody.innerHTML = comisiones.map(c => {
        const iconos = {
            booking: '🅱️',
            airbnb: '🏠',
            vrbo: '🏘️',
            directo: '👤',
            pms: '🔗',
            otra: '💳'
        };

        const icon = iconos[c.plataforma] || '💳';
        const nombre = c.nombre_mostrar || c.plataforma;
        const tipo = c.tipo_comision === 'porcentaje'
            ? `${c.porcentaje || 0}%`
            : `${formatMoney(c.importe_fijo || 0)} fijo`;
        const activo = c.activo ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-neutral">Inactiva</span>';
        const propiedad = c.propiedad_nombre || 'Todas';

        return `
      <tr>
        <td>${icon} <strong>${nombre}</strong></td>
        <td>${tipo}</td>
        <td>${propiedad}</td>
        <td>${activo}</td>
        <td>${c.notas || '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editComision('${c.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteComision('${c.id}')">🗑️</button>
        </td>
      </tr>
    `;
    }).join('');
}

// Renderizar configuración de reparto
function renderRepartoConfig() {
    const container = document.getElementById('reparto-config-list');
    if (!container) return;

    const repartos = S.repartoIngresos || [];

    if (repartos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Sin configuraciones. Añade una para definir cómo se reparten los ingresos.</p>';
        return;
    }

    container.innerHTML = repartos.map(r => {
        const propiedad = r.propiedad_nombre || 'General (todas)';
        const modelo = r.modelo === 'porcentaje'
            ? `${r.porcentaje_propietario || 70}% propietario`
            : r.modelo;
        const activo = r.activo ? 'badge-success' : 'badge-neutral';

        return `
      <div class="item-card" style="cursor:pointer;" onclick="editReparto('${r.id}')">
        <div class="item-card-header">
          <div class="item-card-title">${propiedad}</div>
          <span class="badge ${activo}">${r.activo ? 'Activa' : 'Inactiva'}</span>
        </div>
        <div class="item-card-meta">
          Modelo: ${modelo}<br>
          ${r.notas || ''}
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editReparto('${r.id}')">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteReparto('${r.id}')">🗑️</button>
        </div>
      </div>
    `;
    }).join('');
}

// Renderizar configuración de gastos recurrentes
function renderGastosRecurrentesConfig() {
    const container = document.getElementById('gastos-recurrentes-list');
    if (!container) return;

    const gastos = S.gastosRecurrentes || [];

    if (gastos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Sin gastos recurrentes configurados.</p>';
        return;
    }

    const iconos = {
        suministros: '💡',
        comunidad: '🏢',
        seguros: '🛡️',
        impuestos: '📄',
        otros: '📎'
    };

    container.innerHTML = gastos.filter(g => g.activo).map(g => {
        const icon = iconos[g.categoria] || '📎';
        const propiedad = g.propiedad_nombre || 'Todas';
        const periodicidad = g.periodicidad || 'mensual';
        const fechaFin = g.fecha_fin ? ` hasta ${formatDate(g.fecha_fin)}` : ' (indefinido)';

        return `
      <div class="item-card" style="cursor:pointer;" onclick="editGastoRecurrente('${g.id}')">
        <div class="item-card-header">
          <div class="item-card-title">${icon} ${g.nombre}</div>
          <span class="badge badge-accent">${formatMoney(g.importe)}</span>
        </div>
        <div class="item-card-meta">
          ${propiedad} · ${periodicidad}<br>
          Desde ${formatDate(g.fecha_inicio)}${fechaFin}<br>
          <small>Paga: ${g.pagado_por || 'propietario'}</small>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editGastoRecurrente('${g.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteGastoRecurrente('${g.id}')">🗑️</button>
        </div>
      </div>
    `;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MODALES Y GUARDADO
// ═══════════════════════════════════════════════════════════════════════════

// Nueva comisión
function newComision() {
    document.getElementById('comision-edit-id').value = '';
    document.getElementById('comision-plataforma').value = 'booking';
    document.getElementById('comision-nombre').value = '';
    document.getElementById('comision-tipo').value = 'porcentaje';
    document.getElementById('comision-porcentaje').value = '15';
    document.getElementById('comision-fijo').value = '0';
    document.getElementById('comision-propiedad').value = '';
    document.getElementById('comision-notas').value = '';

    toggleComisionTipo();
    populatePropSelect('comision-propiedad');
    openModal('modal-comision');
}

function editComision(id) {
    const c = S.comisiones.find(x => x.id === id);
    if (!c) return;

    document.getElementById('comision-edit-id').value = id;
    document.getElementById('comision-plataforma').value = c.plataforma || 'booking';
    document.getElementById('comision-nombre').value = c.nombre_mostrar || '';
    document.getElementById('comision-tipo').value = c.tipo_comision || 'porcentaje';
    document.getElementById('comision-porcentaje').value = c.porcentaje || 0;
    document.getElementById('comision-fijo').value = c.importe_fijo || 0;
    document.getElementById('comision-propiedad').value = c.propiedad_id || '';
    document.getElementById('comision-notas').value = c.notas || '';

    toggleComisionTipo();
    populatePropSelect('comision-propiedad');
    openModal('modal-comision');
}

function toggleComisionTipo() {
    const tipo = document.getElementById('comision-tipo').value;
    const porcentajeGroup = document.getElementById('comision-porcentaje-group');
    const fijoGroup = document.getElementById('comision-fijo-group');

    if (tipo === 'porcentaje') {
        porcentajeGroup.style.display = 'block';
        fijoGroup.style.display = 'none';
    } else {
        porcentajeGroup.style.display = 'none';
        fijoGroup.style.display = 'block';
    }
}

async function saveComision() {
    const id = document.getElementById('comision-edit-id').value;
    const plataforma = document.getElementById('comision-plataforma').value;
    const nombre = document.getElementById('comision-nombre').value;
    const tipo = document.getElementById('comision-tipo').value;
    const porcentaje = parseFloat(document.getElementById('comision-porcentaje').value) || 0;
    const fijo = parseFloat(document.getElementById('comision-fijo').value) || 0;
    const propiedadId = document.getElementById('comision-propiedad').value;
    const notas = document.getElementById('comision-notas').value;

    if (!plataforma) return toast('Selecciona una plataforma', 'error');

    const propNombre = propiedadId ? S.propiedades.find(p => p.id === propiedadId)?.propiedad_nombre : null;

    const data = {
        cliente_email: S.clienteEmail,
        plataforma,
        nombre_mostrar: nombre || plataforma,
        tipo_comision: tipo,
        porcentaje: tipo === 'porcentaje' ? porcentaje : 0,
        importe_fijo: tipo === 'fijo' ? fijo : 0,
        propiedad_id: propiedadId || null,
        propiedad_nombre: propNombre,
        activo: true,
        notas
    };

    try {
        if (id) {
            await update(TBL.comisiones, id, data);
            toast('Comisión actualizada');
        } else {
            await create(TBL.comisiones, data);
            toast('Comisión creada');
        }
        await loadAll();
        renderComisiones();
        closeModal('modal-comision');
    } catch (e) {
        toast('Error al guardar', 'error');
    }
}

async function deleteComision(id) {
    if (!confirm('¿Eliminar esta comisión?')) return;
    try {
        await remove(TBL.comisiones, id);
        await loadAll();
        renderComisiones();
        toast('Comisión eliminada');
    } catch (e) {
        toast('Error al eliminar', 'error');
    }
}

// Nuevo reparto
function newReparto() {
    document.getElementById('reparto-edit-id').value = '';
    document.getElementById('reparto-propiedad').value = '';
    document.getElementById('reparto-modelo').value = 'porcentaje';
    document.getElementById('reparto-porcentaje').value = '70';
    document.getElementById('reparto-calcular-sobre').value = 'neto';
    document.getElementById('reparto-desc-comisiones').checked = true;
    document.getElementById('reparto-desc-limpieza').checked = true;
    document.getElementById('reparto-desc-amenities').checked = true;
    document.getElementById('reparto-desc-suministros').checked = false;
    document.getElementById('reparto-notas').value = '';

    populatePropSelect('reparto-propiedad');
    openModal('modal-reparto');
}

function editReparto(id) {
    const r = S.repartoIngresos.find(x => x.id === id);
    if (!r) return;

    document.getElementById('reparto-edit-id').value = id;
    document.getElementById('reparto-propiedad').value = r.propiedad_id || '';
    document.getElementById('reparto-modelo').value = r.modelo || 'porcentaje';
    document.getElementById('reparto-porcentaje').value = r.porcentaje_propietario || 70;
    document.getElementById('reparto-calcular-sobre').value = r.calcular_sobre || 'neto';
    document.getElementById('reparto-desc-comisiones').checked = r.descontar_comisiones !== false;
    document.getElementById('reparto-desc-limpieza').checked = r.descontar_limpieza !== false;
    document.getElementById('reparto-desc-amenities').checked = r.descontar_amenities !== false;
    document.getElementById('reparto-desc-suministros').checked = r.descontar_suministros === true;
    document.getElementById('reparto-notas').value = r.notas || '';

    populatePropSelect('reparto-propiedad');
    openModal('modal-reparto');
}

async function saveReparto() {
    const id = document.getElementById('reparto-edit-id').value;
    const propiedadId = document.getElementById('reparto-propiedad').value;
    const modelo = document.getElementById('reparto-modelo').value;
    const porcentaje = parseFloat(document.getElementById('reparto-porcentaje').value) || 70;
    const calcularSobre = document.getElementById('reparto-calcular-sobre').value;
    const descComisiones = document.getElementById('reparto-desc-comisiones').checked;
    const descLimpieza = document.getElementById('reparto-desc-limpieza').checked;
    const descAmenities = document.getElementById('reparto-desc-amenities').checked;
    const descSuministros = document.getElementById('reparto-desc-suministros').checked;
    const notas = document.getElementById('reparto-notas').value;

    const propNombre = propiedadId ? S.propiedades.find(p => p.id === propiedadId)?.propiedad_nombre : null;

    const data = {
        cliente_email: S.clienteEmail,
        propiedad_id: propiedadId || null,
        propiedad_nombre: propNombre,
        modelo,
        porcentaje_propietario: porcentaje,
        calcular_sobre: calcularSobre,
        descontar_comisiones: descComisiones,
        descontar_limpieza: descLimpieza,
        descontar_amenities: descAmenities,
        descontar_suministros: descSuministros,
        activo: true,
        notas
    };

    try {
        if (id) {
            await update(TBL.repartoIngresos, id, data);
            toast('Configuración actualizada');
        } else {
            await create(TBL.repartoIngresos, data);
            toast('Configuración creada');
        }
        await loadAll();
        renderComisiones();
        closeModal('modal-reparto');
    } catch (e) {
        toast('Error al guardar', 'error');
    }
}

async function deleteReparto(id) {
    if (!confirm('¿Eliminar esta configuración?')) return;
    try {
        await remove(TBL.repartoIngresos, id);
        await loadAll();
        renderComisiones();
        toast('Configuración eliminada');
    } catch (e) {
        toast('Error al eliminar', 'error');
    }
}

// Nuevo gasto recurrente
function newGastoRecurrente() {
    const hoy = new Date().toISOString().split('T')[0];

    document.getElementById('grec-edit-id').value = '';
    document.getElementById('grec-nombre').value = '';
    document.getElementById('grec-categoria').value = 'suministros';
    document.getElementById('grec-importe').value = '';
    document.getElementById('grec-periodicidad').value = 'mensual';
    document.getElementById('grec-fecha-inicio').value = hoy;
    document.getElementById('grec-fecha-fin').value = '';
    document.getElementById('grec-prorratear').checked = true;
    document.getElementById('grec-pagado-por').value = 'propietario';
    document.getElementById('grec-propiedad').value = '';
    document.getElementById('grec-notas').value = '';

    populatePropSelect('grec-propiedad');
    openModal('modal-gasto-recurrente');
}

function editGastoRecurrente(id) {
    const g = S.gastosRecurrentes.find(x => x.id === id);
    if (!g) return;

    document.getElementById('grec-edit-id').value = id;
    document.getElementById('grec-nombre').value = g.nombre || '';
    document.getElementById('grec-categoria').value = g.categoria || 'suministros';
    document.getElementById('grec-importe').value = g.importe || '';
    document.getElementById('grec-periodicidad').value = g.periodicidad || 'mensual';
    document.getElementById('grec-fecha-inicio').value = g.fecha_inicio || '';
    document.getElementById('grec-fecha-fin').value = g.fecha_fin || '';
    document.getElementById('grec-prorratear').checked = g.prorratear !== false;
    document.getElementById('grec-pagado-por').value = g.pagado_por || 'propietario';
    document.getElementById('grec-propiedad').value = g.propiedad_id || '';
    document.getElementById('grec-notas').value = g.notas || '';

    populatePropSelect('grec-propiedad');
    openModal('modal-gasto-recurrente');
}

async function saveGastoRecurrente() {
    const id = document.getElementById('grec-edit-id').value;
    const nombre = document.getElementById('grec-nombre').value;
    const categoria = document.getElementById('grec-categoria').value;
    const importe = parseFloat(document.getElementById('grec-importe').value);
    const periodicidad = document.getElementById('grec-periodicidad').value;
    const fechaInicio = document.getElementById('grec-fecha-inicio').value;
    const fechaFin = document.getElementById('grec-fecha-fin').value;
    const prorratear = document.getElementById('grec-prorratear').checked;
    const pagadoPor = document.getElementById('grec-pagado-por').value;
    const propiedadId = document.getElementById('grec-propiedad').value;
    const notas = document.getElementById('grec-notas').value;

    if (!nombre || !importe || !fechaInicio) {
        return toast('Completa los campos obligatorios', 'error');
    }

    const propNombre = propiedadId ? S.propiedades.find(p => p.id === propiedadId)?.propiedad_nombre : null;

    const data = {
        cliente_email: S.clienteEmail,
        nombre,
        categoria,
        importe,
        periodicidad,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        prorratear,
        pagado_por: pagadoPor,
        propiedad_id: propiedadId || null,
        propiedad_nombre: propNombre,
        activo: true,
        notas
    };

    try {
        if (id) {
            await update(TBL.gastosRecurrentes, id, data);
            toast('Gasto actualizado');
        } else {
            await create(TBL.gastosRecurrentes, data);
            toast('Gasto creado');
        }
        await loadAll();
        renderComisiones();
        closeModal('modal-gasto-recurrente');
    } catch (e) {
        toast('Error al guardar', 'error');
    }
}

async function deleteGastoRecurrente(id) {
    if (!confirm('¿Eliminar este gasto recurrente?')) return;
    try {
        await remove(TBL.gastosRecurrentes, id);
        await loadAll();
        renderComisiones();
        toast('Gasto eliminado');
    } catch (e) {
        toast('Error al eliminar', 'error');
    }
}
