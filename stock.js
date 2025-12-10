// ===============================================
// INVENTARIO / STOCK
// ===============================================

function renderStock() {
  const bajo = S.inventario.filter(i => i.stock < i.stock_minimo);
  const ok = S.inventario.filter(i => i.stock >= i.stock_minimo);
  const reservasFuturas = S.reservas?.length || 0;
  
  $('#stat-bajo-min').textContent = bajo.length;
  $('#stat-agotaran').textContent = 0; // TODO: calcular basado en forecasts
  $('#stat-ok').textContent = ok.length;
  $('#stat-reservas-futuras').textContent = reservasFuturas;
  
  $('#stock-grid').innerHTML = S.inventario.length ? S.inventario.map(i => {
    const isCritical = i.stock < i.stock_minimo;
    const isLow = i.stock < i.stock_minimo * 1.5 && !isCritical;
    
    let statusClass = 'ok', forecastHtml = '';
    if (isCritical) {
      statusClass = 'critical';
      forecastHtml = `<div class="stock-forecast critical">⚠️ Bajo mínimo (${i.stock_minimo})</div>`;
    } else {
      forecastHtml = `<div class="stock-forecast ok">✅ Stock OK</div>`;
    }
    
    const cardClass = isCritical ? 'critical' : (isLow ? 'warning' : '');
    const pagadoBadge = i.pagado_por === 'propietario' 
      ? '<span class="stock-badge prop">👤 Prop</span>' 
      : '<span class="stock-badge gest">🏢 Gest</span>';
    
    // Badge de propiedades específicas
    let propsBadge = '';
    if (i.propiedades_ids && i.propiedades_ids.length > 0) {
      const numProps = i.propiedades_ids.length;
      const propsNames = i.propiedades_ids.map(pid => {
        const p = S.propiedades.find(pr => pr.id === pid);
        return p ? (p.nombre || p.propiedad_nombre) : '?';
      }).join(', ');
      propsBadge = `<span class="stock-badge props" title="${propsNames}">🏠 ${numProps} prop${numProps > 1 ? 's' : ''}</span>`;
    }
    
    return `<div class="stock-card-new ${cardClass}" onclick="editStock(${i.id})">
      <div class="stock-card-top">
        <div class="stock-item-title">${i.item}</div>
        <div class="stock-badges">
          <span class="stock-badge min">Min: ${i.stock_minimo}</span>
          ${i.precio_unidad ? `<span class="stock-badge price">${formatMoney(i.precio_unidad)}</span>` : ''}
          ${pagadoBadge}
          ${propsBadge}
        </div>
      </div>
      ${forecastHtml}
      <div class="stock-stat">
        <div class="stock-val ${statusClass}">${i.stock}</div>
        <div class="stock-label">UNIDADES</div>
      </div>
      <div class="stock-actions-new">
        <button class="stock-btn-new neg" onclick="event.stopPropagation(); adjStock(${i.id}, -1)">➖</button>
        <button class="stock-btn-new" onclick="event.stopPropagation(); adjStock(${i.id}, 1)">➕</button>
        <button class="stock-btn-new" onclick="event.stopPropagation(); editStock(${i.id})">✏️</button>
      </div>
    </div>`;
  }).join('') : empty('📦', 'Sin artículos. ¡Crea el primero!');
}

function openStockModal(item = null) {
  // Reset form
  $('#stock-edit-id').value = '';
  $('#stock-item').value = '';
  $('#stock-qty').value = '0';
  $('#stock-min').value = '10';
  $('#stock-precio').value = '0';
  $('#stock-pagador').value = 'gestor';
  $('#stock-c-limp').value = '0';
  $('#stock-c-hab').value = '0';
  $('#stock-c-bano').value = '0';
  $('#stock-c-cama-doble').value = '0';
  $('#stock-c-cama-indiv').value = '0';
  $('#stock-c-adulto').value = '0';
  $('#stock-c-nino').value = '0';
  $('#stock-c-bebe').value = '0';
  $('#stock-c-huesp').value = '0';
  
  renderStockPropsCheckboxes(item);
  
  if (item) {
    $('#stock-modal-title').textContent = '✏️ Editar Artículo';
    $('#stock-edit-id').value = item.id;
    $('#stock-item').value = item.item || '';
    $('#stock-qty').value = item.stock || 0;
    $('#stock-min').value = item.stock_minimo || 10;
    $('#stock-precio').value = item.precio_unidad || 0;
    $('#stock-pagador').value = item.pagado_por || 'gestor';
    $('#stock-c-limp').value = item.consumo_por_limpieza || 0;
    $('#stock-c-hab').value = item.consumo_habitacion || 0;
    $('#stock-c-bano').value = item.consumo_bano || 0;
    $('#stock-c-cama-doble').value = item.consumo_cama_doble || 0;
    $('#stock-c-cama-indiv').value = item.consumo_cama_indiv || 0;
    $('#stock-c-adulto').value = item.consumo_adulto || 0;
    $('#stock-c-nino').value = item.consumo_nino || 0;
    $('#stock-c-bebe').value = item.consumo_bebe || 0;
    $('#stock-c-huesp').value = item.consumo_huesped || 0;
    $('#stock-btn-delete').style.display = 'block';
  } else {
    $('#stock-modal-title').textContent = '📦 Nuevo Artículo';
    $('#stock-btn-delete').style.display = 'none';
  }
  
  openModal('modal-stock');
}

function renderStockPropsCheckboxes(item = null) {
  const container = $('#stock-props-checkboxes');
  const todasCheck = $('#stock-todas-props');
  
  if (!S.propiedades || S.propiedades.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No hay propiedades creadas</p>';
    return;
  }
  
  const propIds = item?.propiedades_ids || [];
  const tieneTodasONinguna = !propIds || propIds.length === 0;
  
  todasCheck.checked = tieneTodasONinguna;
  
  container.innerHTML = S.propiedades.map(p => {
    const checked = tieneTodasONinguna || propIds.includes(p.id);
    const disabled = tieneTodasONinguna ? 'disabled' : '';
    return `<label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; cursor:pointer; opacity:${tieneTodasONinguna ? '0.5' : '1'};">
      <input type="checkbox" class="stock-prop-check" value="${p.id}" ${checked ? 'checked' : ''} ${disabled}>
      ${p.nombre || p.propiedad_nombre || 'Sin nombre'}
    </label>`;
  }).join('');
}

function toggleAllStockProps(checked) {
  const checkboxes = document.querySelectorAll('.stock-prop-check');
  checkboxes.forEach(cb => {
    cb.disabled = checked;
    cb.checked = checked;
    cb.parentElement.style.opacity = checked ? '0.5' : '1';
  });
}

function getSelectedStockProps() {
  if ($('#stock-todas-props').checked) {
    return [];
  }
  const selected = [];
  document.querySelectorAll('.stock-prop-check:checked').forEach(cb => {
    selected.push(parseInt(cb.value));
  });
  return selected;
}

function editStock(id) {
  const item = S.inventario.find(i => i.id === id);
  if (item) openStockModal(item);
}

async function saveStock() {
  const editId = $('#stock-edit-id').value;
  const propiedadesIds = getSelectedStockProps();
  
  const data = {
    cliente_email: S.clienteEmail,
    item: $('#stock-item').value.trim(),
    stock: parseInt($('#stock-qty').value) || 0,
    stock_minimo: parseInt($('#stock-min').value) || 10,
    precio_unidad: parseFloat($('#stock-precio').value) || 0,
    pagado_por: $('#stock-pagador').value,
    consumo_por_limpieza: parseInt($('#stock-c-limp').value) || 0,
    consumo_habitacion: parseInt($('#stock-c-hab').value) || 0,
    consumo_bano: parseInt($('#stock-c-bano').value) || 0,
    consumo_cama_doble: parseInt($('#stock-c-cama-doble').value) || 0,
    consumo_cama_indiv: parseInt($('#stock-c-cama-indiv').value) || 0,
    consumo_adulto: parseInt($('#stock-c-adulto').value) || 0,
    consumo_nino: parseInt($('#stock-c-nino').value) || 0,
    consumo_bebe: parseInt($('#stock-c-bebe').value) || 0,
    consumo_huesped: parseInt($('#stock-c-huesp').value) || 0,
    propiedades_ids: propiedadesIds
  };
  if (!data.item) return toast('Nombre obligatorio', 'error');
  
  closeModal('modal-stock');
  
  try {
    if (editId) {
      await fetch(`${API}/supa/patch/${TBL.inventario}?id=eq.${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      toast('✅ Artículo actualizado');
    } else {
      await create(TBL.inventario, data);
      toast('✅ Artículo creado');
    }
    await loadAll();
    renderStock();
    renderDashboard();
  } catch (e) {
    console.error(e);
    toast('Error al guardar', 'error');
  }
}

async function deleteStock() {
  const editId = $('#stock-edit-id').value;
  if (!editId) return;
  
  if (!confirm('¿Eliminar este artículo del inventario?')) return;
  
  closeModal('modal-stock');
  
  try {
    await fetch(`${API}/supa/delete/${TBL.inventario}?id=eq.${editId}`, { method: 'DELETE' });
    await loadAll();
    renderStock();
    renderDashboard();
    toast('🗑️ Artículo eliminado');
  } catch (e) {
    console.error(e);
    toast('Error al eliminar', 'error');
  }
}

async function adjStock(id, delta) {
  const item = S.inventario.find(i => i.id === id);
  if (!item) return;
  
  const newStock = Math.max(0, (item.stock || 0) + delta);
  
  try {
    await fetch(`${API}/supa/patch/${TBL.inventario}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock })
    });
    item.stock = newStock;
    renderStock();
  } catch (e) {
    console.error(e);
    toast('Error al ajustar stock', 'error');
  }
}
