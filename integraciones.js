// ===============================================
// INTEGRACIONES - PMS y sincronización
// ===============================================
// ===== INTEGRACIONES =====
async function loadIntegraciones() {
  try {
    // Cargar credenciales
    const credRes = await fetch(`${API}/supa/list/${TBL.credenciales}?cliente_email=eq.${encodeURIComponent(S.clienteEmail)}`);
    S.credenciales = await credRes.json();
    
    // Cargar property mappings
    const mapRes = await fetch(`${API}/supa/list/${TBL.propertyMapping}?cliente_email=eq.${encodeURIComponent(S.clienteEmail)}`);
    S.propertyMappings = await mapRes.json();
    
    renderIntegraciones();
  } catch (e) {
    console.error('Error loading integraciones:', e);
  }
}

function renderIntegraciones() {
  // Stats
  const activas = S.credenciales.filter(c => c.activo).length;
  $('#stat-integraciones').textContent = activas;
  $('#stat-props-importadas').textContent = S.propertyMappings.length;
  
  // Last sync
  const lastSync = S.credenciales.reduce((latest, c) => {
    if (c.last_sync_at && (!latest || new Date(c.last_sync_at) > new Date(latest))) {
      return c.last_sync_at;
    }
    return latest;
  }, null);
  $('#stat-last-sync').textContent = lastSync ? formatDate(lastSync) : '-';
  
  // Update platform statuses
  Object.keys(PLATFORMS).forEach(p => {
    const cred = S.credenciales.find(c => c.plataforma === p);
    const statusEl = $(`#status-${p}`);
    const cardEl = statusEl?.closest('.integration-card');
    
    if (cred && cred.activo) {
      statusEl.textContent = '✓ Conectado';
      statusEl.style.color = 'var(--success)';
      cardEl?.classList.add('connected');
    } else {
      statusEl.textContent = 'No conectado';
      statusEl.style.color = 'var(--text-muted)';
      cardEl?.classList.remove('connected');
    }
  });
  
  // Table
  const tbody = $('#integraciones-tbody');
  const emptyEl = $('#integraciones-empty');
  
  if (!S.credenciales.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  
  emptyEl.style.display = 'none';
  tbody.innerHTML = S.credenciales.map(c => {
    const props = S.propertyMappings.filter(p => 
      (c.plataforma === 'avaibook' && p.avaibook_accommodation_id) ||
      (c.plataforma === 'icnea' && p.icnea_lodging_id) ||
      (c.plataforma === 'hostify' && p.hostify_property_id)
    ).length;
    
    const statusClass = c.activo ? (c.last_sync_status === 'error' ? 'badge-danger' : 'badge-success') : 'badge-neutral';
    const statusText = c.activo ? (c.last_sync_status === 'error' ? 'Error' : 'Activo') : 'Inactivo';
    const nombreCuenta = c.nombre_cuenta || PLATFORMS[c.plataforma]?.name || c.plataforma;
    
    return `
      <tr>
        <td>
          <strong>${nombreCuenta}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${PLATFORMS[c.plataforma]?.name || c.plataforma}</div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${props}</td>
        <td>${c.last_sync_at ? formatDate(c.last_sync_at) : 'Nunca'}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-sm btn-secondary" onclick="syncPropiedades('${c.plataforma}')" title="Importar propiedades">🏠</button>
          <button class="btn btn-sm btn-secondary" onclick="syncReservas('${c.plataforma}')" title="Sincronizar reservas">📅</button>
          <button class="btn btn-sm btn-secondary" onclick="openIntegrationModal('${c.plataforma}', ${c.id})" title="Editar">✏️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Props table
  renderPropsImportadas();
}

function renderPropsImportadas() {
  const tbody = $('#props-importadas-tbody');
  if (!tbody) return;
  
  if (!S.propertyMappings.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No hay propiedades importadas</td></tr>';
    return;
  }
  
  tbody.innerHTML = S.propertyMappings.map(p => {
    const origen = p.avaibook_accommodation_id ? 'Avaibook' : 
                   p.icnea_lodging_id ? 'Icnea' : 
                   p.hostify_property_id ? 'Hostify' : 'Manual';
    const extId = p.avaibook_accommodation_id || p.icnea_lodging_id || p.hostify_property_id || '-';
    
    return `
      <tr>
        <td><strong>${p.propiedad_nombre || p.nombre_externo || 'Sin nombre'}</strong></td>
        <td><span class="badge badge-neutral">${origen}</span></td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${extId}</td>
        <td>${p.total_rooms || '-'}</td>
        <td>${p.total_camas_dobles || 0}D / ${p.total_camas_individuales || 0}I</td>
        <td>€${p.precio_limpieza || 45}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="editPropMapping(${p.id})">✏️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openIntegrationModal(plataforma, editId = null) {
  const platform = PLATFORMS[plataforma];
  if (!platform) return;
  
  $('#integ-plataforma').value = plataforma;
  $('#integ-edit-id').value = editId || '';
  $('#integ-modal-title').textContent = `🔗 ${platform.name}`;
  $('#integ-help-text').textContent = platform.help;
  
  // Show/hide fields based on platform
  $('#integ-fields-apikey').style.display = platform.fields.includes('apikey') ? 'block' : 'none';
  $('#integ-fields-userid').style.display = platform.fields.includes('userid') ? 'block' : 'none';
  $('#integ-fields-secret').style.display = platform.fields.includes('secret') ? 'block' : 'none';
  
  // Clear fields
  $('#integ-nombre').value = '';
  $('#integ-apikey').value = '';
  $('#integ-userid').value = '';
  $('#integ-secret').value = '';
  $('#integ-interval').value = '60';
  $('#integ-activo').checked = true;
  
  // If editing, load existing data
  if (editId) {
    const cred = S.credenciales.find(c => c.id === editId);
    if (cred) {
      $('#integ-nombre').value = cred.nombre_cuenta || '';
      $('#integ-apikey').value = cred.api_key || '';
      $('#integ-userid').value = cred.user_id || '';
      $('#integ-secret').value = cred.api_secret || '';
      $('#integ-interval').value = cred.sync_interval_minutes || 60;
      $('#integ-activo').checked = cred.activo;
    }
    $('#integ-btn-delete').style.display = 'block';
  } else {
    // Sugerir nombre por defecto
    const existingCount = S.credenciales.filter(c => c.plataforma === plataforma).length;
    $('#integ-nombre').value = existingCount > 0 ? `${platform.name} ${existingCount + 1}` : platform.name;
    $('#integ-btn-delete').style.display = 'none';
  }
  
  document.getElementById('modal-integracion').classList.add('open');
}

async function saveIntegracion() {
  const plataforma = $('#integ-plataforma').value;
  const editId = $('#integ-edit-id').value;
  const nombreCuenta = $('#integ-nombre').value.trim();
  const apiKey = $('#integ-apikey').value.trim();
  const userId = $('#integ-userid').value.trim();
  const secret = $('#integ-secret').value.trim();
  const interval = parseInt($('#integ-interval').value);
  const activo = $('#integ-activo').checked;
  
  if (!nombreCuenta) {
    toast('Nombre de cuenta es requerido', 'error');
    return;
  }
  if (!apiKey) {
    toast('API Key es requerido', 'error');
    return;
  }
  
  const data = {
    cliente_email: S.clienteEmail,
    plataforma,
    nombre_cuenta: nombreCuenta,
    api_key: apiKey,
    user_id: userId || null,
    api_secret: secret || null,
    sync_interval_minutes: interval,
    activo
  };
  
  console.log('Saving integration:', data);
  
  try {
    let res;
    
    if (editId) {
      // Editar existente
      res = await fetch(`${API}/supa/patch/${TBL.credenciales}?id=eq.${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      // Crear nuevo
      res = await fetch(`${API}/supa/create/${TBL.credenciales}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }
    
    console.log('Response status:', res.status);
    const responseText = await res.text();
    console.log('Response body:', responseText);
    
    if (!res.ok) {
      throw new Error(responseText || 'Error al guardar');
    }
    
    toast('Integración guardada correctamente');
    closeModal('modal-integracion');
    await loadIntegraciones();
    
    // Preguntar si quiere importar propiedades ahora
    if (!editId && confirm('¿Importar propiedades de ' + PLATFORMS[plataforma].name + ' ahora?')) {
      await syncPropiedades(plataforma);
    }
    
  } catch (e) {
    console.error('Error saving integration:', e);
    toast('Error: ' + e.message, 'error');
  }
}

async function syncPropiedades(plataforma) {
  toast('Importando propiedades de ' + (PLATFORMS[plataforma]?.name || plataforma) + '...');
  
  // URL del webhook de n8n (ajusta a tu instancia)
  const n8nWebhookBase = 'https://n8n.adrianmartinbernabe.com/webhook';
  const webhookUrl = `${n8nWebhookBase}/cleanmanager/sync/propiedades/${plataforma}`;
  
  try {
    const res = await fetch(webhookUrl, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_email: S.clienteEmail })
    });
    
    if (res.ok) {
      const result = await res.json();
      toast(`✅ ${result.count || 0} propiedades importadas`);
      await loadIntegraciones();
    } else {
      toast('Error al importar propiedades', 'error');
    }
  } catch (e) {
    console.error('Sync error:', e);
    toast('No se pudo conectar con n8n. Verifica que el workflow esté activo.', 'error');
  }
}

async function syncReservas(plataforma) {
  toast('Sincronizando reservas de ' + (PLATFORMS[plataforma]?.name || plataforma) + '...');
  
  const n8nWebhookBase = 'https://n8n.adrianmartinbernabe.com/webhook';
  const webhookUrl = `${n8nWebhookBase}/cleanmanager/sync/reservas/${plataforma}`;
  
  try {
    const res = await fetch(webhookUrl, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_email: S.clienteEmail })
    });
    
    if (res.ok) {
      toast('✅ Reservas sincronizadas');
      await loadIntegraciones();
    } else {
      toast('Error al sincronizar reservas', 'error');
    }
  } catch (e) {
    console.error('Sync error:', e);
    toast('No se pudo conectar con n8n', 'error');
  }
}

async function deleteIntegracion() {
  const editId = $('#integ-edit-id').value;
  if (!editId) return;
  
  if (!confirm('¿Eliminar esta integración? Las propiedades importadas se mantendrán.')) return;
  
  try {
    await fetch(`${API}/supa/delete/${TBL.credenciales}?id=eq.${editId}`, { method: 'DELETE' });
    toast('Integración eliminada');
    closeModal('modal-integracion');
    await loadIntegraciones();
  } catch (e) {
    toast('Error al eliminar', 'error');
  }
}

async function syncAllProperties() {
  toast('Sincronizando todas las propiedades...');
  
  // Sync cada plataforma que tenga credenciales activas
  const plataformas = [...new Set(S.credenciales.filter(c => c.activo).map(c => c.plataforma))];
  
  for (const plataforma of plataformas) {
    await syncPropiedades(plataforma);
  }
}

function editPropMapping(id) {
  const prop = S.propertyMappings.find(p => p.id === id);
  if (!prop) return;
  
  $('#map-prop-id').value = id;
  $('#map-prop-nombre').value = prop.propiedad_nombre || '';
  $('#map-prop-rooms').value = prop.total_rooms || 1;
  $('#map-prop-baths').value = prop.total_bathrooms || 1;
  $('#map-prop-camas-dobles').value = prop.total_camas_dobles || 0;
  $('#map-prop-camas-ind').value = prop.total_camas_individuales || 0;
  $('#map-prop-precio').value = prop.precio_limpieza || 45;
  $('#map-prop-duracion').value = prop.duracion_limpieza_minutos || 90;
  
  document.getElementById('modal-mapear-prop').classList.add('open');
}

async function savePropMapping() {
  const id = $('#map-prop-id').value;
  
  const data = {
    propiedad_nombre: $('#map-prop-nombre').value.trim(),
    total_rooms: parseInt($('#map-prop-rooms').value) || 1,
    total_bathrooms: parseInt($('#map-prop-baths').value) || 1,
    total_camas_dobles: parseInt($('#map-prop-camas-dobles').value) || 0,
    total_camas_individuales: parseInt($('#map-prop-camas-ind').value) || 0,
    precio_limpieza: parseFloat($('#map-prop-precio').value) || 45,
    duracion_limpieza_minutos: parseInt($('#map-prop-duracion').value) || 90
  };
  
  if (!data.propiedad_nombre) {
    toast('Nombre es requerido', 'error');
    return;
  }
  
  try {
    await fetch(`${API}/supa/patch/${TBL.propertyMapping}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    toast('Propiedad actualizada');
    closeModal('modal-mapear-prop');
    await loadIntegraciones();
  } catch (e) {
    toast('Error al guardar', 'error');
  }
}
