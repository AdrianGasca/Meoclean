// ===============================================
// ALERTAS, LIMPIEZAS, INFORMES, FORECASTS
// ===============================================
function calculateForecasts() {
  stockForecasts.clear();
  const today = new Date();
  const futureReservas = S.reservas.filter(r => {
    const fecha = new Date(r.fecha_servicio || r.checkout);
    return fecha >= today && r.estado !== 'cancelado';
  }).sort((a, b) => new Date(a.fecha_servicio || a.checkout) - new Date(b.fecha_servicio || b.checkout));

  for (const item of S.stock) {
    let stockSimulado = item.stock;
    let fechaRotura = null;
    
    for (const reserva of futureReservas) {
      const consumo = calcConsumoReserva(item, reserva);
      stockSimulado -= consumo;
      
      if (stockSimulado <= 0 && !fechaRotura) {
        fechaRotura = reserva.fecha_servicio || reserva.checkout;
        break;
      }
    }
    
    stockForecasts.set(item.id, {
      stockFinal: Math.max(0, stockSimulado),
      fechaRotura: fechaRotura,
      reservasPendientes: futureReservas.length
    });
  }
  
  updateForecastBadges();
}

function updateForecastBadges() {
  let bajoMin = 0, agotaran = 0, ok = 0;
  
  for (const item of S.stock) {
    const forecast = stockForecasts.get(item.id);
    if (item.stock < item.stock_minimo) {
      bajoMin++;
    } else if (forecast?.fechaRotura) {
      agotaran++;
    } else {
      ok++;
    }
  }
  
  $('#stat-bajo-min').textContent = bajoMin;
  $('#stat-agotaran').textContent = agotaran;
  $('#stat-ok').textContent = ok;
  $('#alert-bajo-min').textContent = bajoMin;
  $('#alert-agotaran').textContent = agotaran;
  $('#alert-ok').textContent = ok;
  
  const badge = $('#stock-alert-badge');
  if (bajoMin > 0) {
    badge.textContent = bajoMin;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

function changeMonth(delta) {
  const e = window.event;
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const [year, month] = currentLimpiezasMes.split('-').map(Number);
  const newDate = new Date(year, month - 1 + delta, 1);
  currentLimpiezasMes = newDate.toISOString().slice(0, 7);
  renderLimpiezasMes();
  
  return false;
}

function renderLimpiezasMes() {
  const [year, month] = currentLimpiezasMes.split('-');
  const mesLabel = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  $('#limpiezas-mes-label').textContent = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  
  // Filtrar propietario
  const propSelect = $('#limpiezas-propietario');
  propSelect.innerHTML = '<option value="">Todos los propietarios</option>' + 
    S.propietarios.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  
  const propFiltro = propSelect.value;
  
  // Filtrar servicios del mes
  const serviciosMes = S.servicios.filter(s => {
    const fecha = (s.fecha_servicio || '').slice(0, 7);
    if (fecha !== currentLimpiezasMes) return false;
    if (propFiltro) {
      const prop = S.propiedades.find(p => p.id === s.propiedad_id);
      if (!prop || prop.propietario_id != propFiltro) return false;
    }
    return true;
  });
  
  let totalLimpiezas = serviciosMes.length;
  let costeGestor = 0, costePropietario = 0;
  
  const tbody = $('#limpiezas-table');
  tbody.innerHTML = serviciosMes.map(s => {
    const prop = S.propiedades.find(p => p.id === s.propiedad_id) || {};
    const precioBase = prop.precio_limpieza || 45;
    const extras = S.extras.filter(e => e.servicio_id === s.id).reduce((sum, e) => sum + (e.importe || 0), 0);
    const total = precioBase + extras;
    const paga = prop.pago_limpieza || 'gestor';
    
    if (paga === 'gestor') costeGestor += total;
    else costePropietario += total;
    
    return `<tr>
      <td>${formatDate(s.fecha_servicio)}</td>
      <td>${prop.nombre || '-'}</td>
      <td><span class="badge badge-${s.tipo === 'checkout' ? 'accent' : 'neutral'}">${s.tipo || 'normal'}</span></td>
      <td>${formatMoney(precioBase)}</td>
      <td>${extras > 0 ? formatMoney(extras) : '-'}</td>
      <td><strong>${formatMoney(total)}</strong></td>
      <td><span class="badge ${paga === 'gestor' ? 'badge-accent' : 'badge-warning'}">${paga}</span></td>
      <td><button class="btn btn-sm btn-secondary" onclick="editServicio(${s.id})">✏️</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Sin limpiezas este mes</td></tr>';
  
  $('#limp-total').textContent = totalLimpiezas;
  $('#limp-gestor').textContent = formatMoney(costeGestor);
  $('#limp-propietario').textContent = formatMoney(costePropietario);
  $('#limp-total-cost').textContent = formatMoney(costeGestor + costePropietario);
}

function renderInformes() {
  // Inicializar selects de propietarios
  const propSelect = $('#informe-propietario');
  if (propSelect) {
    propSelect.innerHTML = S.propietarios.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  }
  
  // Set default month
  const currentMonth = new Date().toISOString().slice(0, 7);
  if ($('#informe-mes')) $('#informe-mes').value = currentMonth;
  if ($('#excel-mes')) $('#excel-mes').value = currentMonth;
}

function generarInformePDF() {
  const mes = $('#informe-mes').value || currentConsumosMes;
  const tipo = $('#informe-tipo').value;
  
  let content = '';
  const [year, month] = mes.split('-');
  const mesLabel = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  if (tipo === 'mensual') {
    const gastos = calcGastosMes(mes);
    const serviciosMes = S.servicios.filter(s => (s.fecha_servicio || '').slice(0, 7) === mes);
    
    content = `
      <html><head><title>Informe ${mesLabel}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto}h1{color:#6366f1}h2{color:#333;border-bottom:2px solid #6366f1;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:12px;border:1px solid #ddd;text-align:left}th{background:#f8f9fa}.total{font-weight:bold;background:#eff6ff}.stat-box{display:inline-block;padding:15px 25px;background:#f8f9fa;border-radius:8px;margin:10px 10px 10px 0;text-align:center}.stat-box .num{font-size:24px;font-weight:bold;color:#6366f1}.stat-box .label{font-size:12px;color:#666}</style>
      </head><body>
      <h1>📊 Informe Mensual</h1>
      <h2>${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}</h2>
      
      <div class="stat-box"><div class="num">${serviciosMes.length}</div><div class="label">Limpiezas</div></div>
      <div class="stat-box"><div class="num">${formatMoney(gastos.total)}</div><div class="label">Consumos Total</div></div>
      <div class="stat-box"><div class="num">${formatMoney(gastos.gestor)}</div><div class="label">Paga Gestor</div></div>
      <div class="stat-box"><div class="num">${formatMoney(gastos.propietario)}</div><div class="label">Paga Propietario</div></div>
      
      <h2>📋 Desglose de Consumos</h2>
      <table>
        <tr><th>Artículo</th><th>Unidades</th><th>Precio/Ud</th><th>Total</th><th>Paga</th></tr>
        ${gastos.desglose.map(g => `<tr><td>${g.nombre}</td><td>${g.unidades}</td><td>${formatMoney(g.precioUnitario)}</td><td>${formatMoney(g.total)}</td><td>${g.pagador}</td></tr>`).join('')}
        <tr class="total"><td colspan="3">TOTAL</td><td>${formatMoney(gastos.total)}</td><td></td></tr>
      </table>
      
      <p style="margin-top:40px;color:#666;font-size:12px">Generado el ${new Date().toLocaleDateString('es-ES')} - CleanManager Pro</p>
      </body></html>
    `;
  } else if (tipo === 'propietario') {
    const propId = $('#informe-propietario').value;
    const prop = S.propietarios.find(p => p.id == propId);
    if (!prop) { toast('Selecciona un propietario', 'error'); return; }
    
    content = generarInformePropietarioPDF(prop, mes, mesLabel);
  } else if (tipo === 'consumos') {
    const gastos = calcGastosMes(mes);
    content = `<html><head><title>Consumos ${mesLabel}</title><style>body{font-family:Arial;padding:40px}h1{color:#6366f1}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ddd}th{background:#f8f9fa}</style></head><body><h1>💰 Consumos Detallado - ${mesLabel}</h1><table><tr><th>Artículo</th><th>Unidades</th><th>Precio</th><th>Total</th><th>Pagador</th></tr>${gastos.desglose.map(g => `<tr><td>${g.nombre}</td><td>${g.unidades}</td><td>${formatMoney(g.precioUnitario)}</td><td>${formatMoney(g.total)}</td><td>${g.pagador}</td></tr>`).join('')}</table></body></html>`;
  } else if (tipo === 'limpiezas') {
    const serviciosMes = S.servicios.filter(s => (s.fecha_servicio || '').slice(0, 7) === mes);
    content = `<html><head><title>Limpiezas ${mesLabel}</title><style>body{font-family:Arial;padding:40px}h1{color:#6366f1}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ddd}th{background:#f8f9fa}</style></head><body><h1>🧹 Limpiezas - ${mesLabel}</h1><table><tr><th>Fecha</th><th>Propiedad</th><th>Tipo</th><th>Estado</th></tr>${serviciosMes.map(s => { const p = S.propiedades.find(pr => pr.id === s.propiedad_id); return `<tr><td>${formatDate(s.fecha_servicio)}</td><td>${p?.nombre || '-'}</td><td>${s.tipo || 'normal'}</td><td>${s.estado}</td></tr>`; }).join('')}</table></body></html>`;
  }
  
  // Preview
  $('#informe-preview').innerHTML = `<iframe srcdoc="${content.replace(/"/g, '&quot;')}" style="width:100%;height:400px;border:none;border-radius:8px;"></iframe>`;
  
  // Open print
  const win = window.open('', '_blank');
  win.document.write(content);
  win.document.close();
  win.print();
  
  toast('📄 PDF generado', 'success');
}

function generarInformePropietarioPDF(prop, mes, mesLabel) {
  const propiedadesProp = S.propiedades.filter(p => p.propietario_id === prop.id);
  const propIds = propiedadesProp.map(p => p.id);
  
  const serviciosMes = S.servicios.filter(s => 
    (s.fecha_servicio || '').slice(0, 7) === mes && propIds.includes(s.propiedad_id)
  );
  
  let totalLimpiezas = 0, gastosLimpieza = 0;
  serviciosMes.forEach(s => {
    const p = propiedadesProp.find(pr => pr.id === s.propiedad_id);
    if (p?.pago_limpieza === 'propietario') {
      totalLimpiezas++;
      gastosLimpieza += p.precio_limpieza || 45;
    }
  });
  
  // Consumos del propietario
  let gastosConsumos = 0;
  const consumosProp = [];
  for (const item of S.stock) {
    if (item.pagado_por !== 'propietario') continue;
    let unidades = 0;
    for (const s of serviciosMes) {
      unidades += calcConsumoReserva(item, s);
    }
    if (unidades > 0) {
      const subtotal = unidades * (item.precio_unidad || 0);
      gastosConsumos += subtotal;
      consumosProp.push({ nombre: item.item, unidades, precio: item.precio_unidad, total: subtotal });
    }
  }
  
  return `
    <html><head><title>Informe ${prop.nombre} - ${mesLabel}</title>
    <style>body{font-family:Arial;padding:40px;max-width:800px;margin:auto}h1{color:#6366f1}h2{border-bottom:2px solid #6366f1;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border:1px solid #ddd}th{background:#f8f9fa}.total{font-weight:bold;background:#eff6ff}.highlight{background:#fff3cd;padding:20px;border-radius:8px;margin:20px 0}</style>
    </head><body>
    <h1>👤 Informe para ${prop.nombre}</h1>
    <h2>${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}</h2>
    
    <p><strong>Propiedades:</strong> ${propiedadesProp.map(p => p.nombre).join(', ')}</p>
    
    <h2>🧹 Limpiezas a cargo del propietario</h2>
    <p>Total: <strong>${totalLimpiezas}</strong> limpiezas = <strong>${formatMoney(gastosLimpieza)}</strong></p>
    
    <h2>📦 Consumos a cargo del propietario</h2>
    <table>
      <tr><th>Artículo</th><th>Unidades</th><th>Precio/Ud</th><th>Total</th></tr>
      ${consumosProp.map(c => `<tr><td>${c.nombre}</td><td>${c.unidades}</td><td>${formatMoney(c.precio)}</td><td>${formatMoney(c.total)}</td></tr>`).join('')}
    </table>
    
    <div class="highlight">
      <h3>💰 TOTAL A PAGAR POR EL PROPIETARIO</h3>
      <p style="font-size:24px;color:#6366f1;margin:10px 0"><strong>${formatMoney(gastosLimpieza + gastosConsumos)}</strong></p>
      <p>Limpiezas: ${formatMoney(gastosLimpieza)} + Consumos: ${formatMoney(gastosConsumos)}</p>
    </div>
    
    <p style="margin-top:40px;color:#666;font-size:12px">Generado el ${new Date().toLocaleDateString('es-ES')} - CleanManager Pro</p>
    </body></html>
  `;
}

function exportarExcel() {
  const mes = $('#excel-mes').value || currentConsumosMes;
  const tipo = $('#excel-tipo').value;
  
  let csv = '';
  
  if (tipo === 'completo' || tipo === 'inventario') {
    csv += 'INVENTARIO\n';
    csv += 'Artículo,Stock,Mínimo,Precio,Pagado Por\n';
    S.stock.forEach(i => {
      csv += `"${i.item}",${i.stock},${i.stock_minimo},${i.precio_unidad || 0},${i.pagado_por || 'gestor'}\n`;
    });
    csv += '\n';
  }
  
  if (tipo === 'completo' || tipo === 'gastos') {
    const gastos = calcGastosMes(mes);
    csv += 'GASTOS DEL MES\n';
    csv += 'Artículo,Unidades,Precio Unitario,Total,Pagador\n';
    gastos.desglose.forEach(g => {
      csv += `"${g.nombre}",${g.unidades},${g.precioUnitario},${g.total},${g.pagador}\n`;
    });
    csv += `\nTOTAL,,, ${gastos.total}\n\n`;
  }
  
  if (tipo === 'completo' || tipo === 'limpiezas') {
    const serviciosMes = S.servicios.filter(s => (s.fecha_servicio || '').slice(0, 7) === mes);
    csv += 'LIMPIEZAS\n';
    csv += 'Fecha,Propiedad,Tipo,Estado\n';
    serviciosMes.forEach(s => {
      const p = S.propiedades.find(pr => pr.id === s.propiedad_id);
      csv += `${s.fecha_servicio},"${p?.nombre || ''}",${s.tipo || 'normal'},${s.estado}\n`;
    });
    csv += '\n';
  }
  
  if (tipo === 'propietarios') {
    csv += 'RESUMEN POR PROPIETARIO\n';
    csv += 'Propietario,Propiedades,Limpiezas (€),Consumos (€),Total (€)\n';
    S.propietarios.forEach(prop => {
      const props = S.propiedades.filter(p => p.propietario_id === prop.id);
      // Simplified calculation
      csv += `"${prop.nombre}",${props.length},0,0,0\n`;
    });
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cleanmanager_${mes}.csv`;
  link.click();
  
  toast('📗 Excel descargado', 'success');
}

function exportPDFMensual() {
  $('#informe-mes').value = currentConsumosMes;
  $('#informe-tipo').value = 'mensual';
  generarInformePDF();
}

function exportExcelCompleto() {
  $('#excel-mes').value = currentConsumosMes;
  $('#excel-tipo').value = 'completo';
  exportarExcel();
}

function openInformePropietario() {
  $('#informe-tipo').value = 'propietario';
  document.getElementById('informe-propietario-select').style.display = 'block';
  $('#informe-propietario').innerHTML = S.propietarios.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  navigate('informes');
}

// Toggle propietario select visibility
document.getElementById('informe-tipo')?.addEventListener('change', function() {
  document.getElementById('informe-propietario-select').style.display = this.value === 'propietario' ? 'block' : 'none';
});

function loadAlertConfig() {
  const config = JSON.parse(localStorage.getItem('cleanmanager_alerts') || '{}');
  if (config.whatsapp) $('#alert-whatsapp').value = config.whatsapp;
  if (config.email) $('#alert-email').value = config.email;
  if (config.stockBajo !== undefined) $('#alert-stock').checked = config.stockBajo;
  if (config.rotura !== undefined) $('#alert-rotura').checked = config.rotura;
  if (config.diasRotura) $('#alert-dias-rotura').value = config.diasRotura;
  if (config.semanal !== undefined) $('#alert-semanal').checked = config.semanal;
  
  updateAlertPreview();
  renderAlertasEstado();
}

function saveAlertConfig() {
  const config = {
    whatsapp: $('#alert-whatsapp').value,
    email: $('#alert-email').value,
    stockBajo: $('#alert-stock').checked,
    rotura: $('#alert-rotura').checked,
    diasRotura: $('#alert-dias-rotura').value,
    semanal: $('#alert-semanal').checked
  };
  localStorage.setItem('cleanmanager_alerts', JSON.stringify(config));
  toast('✅ Configuración guardada', 'success');
}

function getAlertasActivas() {
  const diasAlerta = parseInt($('#alert-dias-rotura')?.value || 7);
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + diasAlerta);
  
  const criticos = [], bajos = [];
  
  for (const item of S.stock) {
    const forecast = stockForecasts.get(item.id);
    if (forecast?.fechaRotura && new Date(forecast.fechaRotura) <= fechaLimite) {
      criticos.push({ item: item.item, stock: item.stock, fechaRotura: formatDate(forecast.fechaRotura) });
    } else if (item.stock < item.stock_minimo) {
      bajos.push({ item: item.item, stock: item.stock, min: item.stock_minimo });
    }
  }
  
  return { criticos, bajos, length: criticos.length + bajos.length };
}

function updateAlertPreview() {
  const preview = $('#alert-preview');
  if (!preview) return;
  
  const alertas = getAlertasActivas();
  
  if (alertas.length === 0) {
    preview.textContent = '✅ *Todo en orden!*\n\nNo hay alertas de stock en este momento.';
    return;
  }
  
  let msg = '⚠️ *ALERTA DE STOCK*\n\n';
  
  if (alertas.criticos.length > 0) {
    msg += '🚨 *CRÍTICO - Se agotará pronto:*\n';
    alertas.criticos.forEach(a => {
      msg += `• ${a.item}: ${a.stock} uds (se agota ${a.fechaRotura})\n`;
    });
    msg += '\n';
  }
  
  if (alertas.bajos.length > 0) {
    msg += '⚠️ *Stock bajo mínimo:*\n';
    alertas.bajos.forEach(a => {
      msg += `• ${a.item}: ${a.stock}/${a.min} uds\n`;
    });
  }
  
  preview.textContent = msg;
}

function renderAlertasEstado() {
  const container = $('#alertas-estado-actual');
  if (!container) return;
  
  const alertas = getAlertasActivas();
  
  if (alertas.length === 0) {
    container.innerHTML = '<div class="alert-status success">✅ Todo el inventario está en orden</div>';
    return;
  }
  
  let html = '';
  if (alertas.criticos.length > 0) {
    html += `<div class="alert-status error">🚨 ${alertas.criticos.length} artículo(s) se agotarán pronto</div>`;
  }
  if (alertas.bajos.length > 0) {
    html += `<div class="alert-status" style="background:var(--warning-bg);color:var(--warning);">⚠️ ${alertas.bajos.length} artículo(s) bajo mínimo</div>`;
  }
  container.innerHTML = html;
}

async function testWhatsApp() {
  const phone = $('#alert-whatsapp').value.replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    toast('Introduce un número válido', 'error');
    return;
  }
  
  toast('Enviando mensaje de prueba...');
  
  try {
    const response = await fetch('https://n8n.adrianmartinbernabe.com/webhook/builderbot/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: phone,
        mensaje: '✅ *Prueba de Alertas CleanManager*\n\nEste es un mensaje de prueba del sistema de alertas.\n\n¡Configuración correcta!'
      })
    });
    
    if (response.ok) {
      $('#whatsapp-status').innerHTML = '<div class="alert-status success">✅ Mensaje enviado correctamente</div>';
      toast('✅ Mensaje enviado', 'success');
    } else {
      throw new Error('Error en respuesta');
    }
  } catch (e) {
    console.error(e);
    $('#whatsapp-status').innerHTML = '<div class="alert-status error">❌ Error al enviar mensaje</div>';
    toast('Error al enviar', 'error');
  }
}

async function sendAlertaNow() {
  const phone = $('#alert-whatsapp').value.replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    toast('Configura el número primero', 'error');
    return;
  }
  
  const alertas = getAlertasActivas();
  if (alertas.length === 0) {
    toast('No hay alertas que enviar', 'success');
    return;
  }
  
  const mensaje = $('#alert-preview').textContent;
  toast('Enviando alerta...');
  
  try {
    await fetch('https://n8n.adrianmartinbernabe.com/webhook/builderbot/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono: phone, mensaje })
    });
    toast('✅ Alerta enviada', 'success');
  } catch (e) {
    console.error(e);
    toast('Error al enviar', 'error');
  }
}

// ===============================================
// INICIALIZACIÓN EXTRA
// ===============================================
const originalInit = window.initApp;
window.initApp = async function() {
  if (originalInit) await originalInit();
  
  // Init nuevas vistas
  setTimeout(() => {
    calculateForecasts();
    loadAlertConfig();
    
    // Set default month inputs
    const currentMonth = new Date().toISOString().slice(0, 7);
    if ($('#informe-mes')) $('#informe-mes').value = currentMonth;
    if ($('#excel-mes')) $('#excel-mes').value = currentMonth;
  }, 1000);
};

// Override navigate to handle new views
const originalNavigate = window.navigate;
window.navigate = function(view) {
  originalNavigate(view);
  
  if (view === 'limpiezas') {
    renderLimpiezasMes();
  } else if (view === 'consumos') {
    renderConsumos();
  } else if (view === 'informes') {
    // Informes ready
  } else if (view === 'alertas') {
    calculateForecasts();
    updateAlertPreview();
    renderAlertasEstado();
  } else if (view === 'stock') {
    calculateForecasts();
  }
};
