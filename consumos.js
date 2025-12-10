// ===============================================
// CONSUMOS MENSUALES - v2 (limpio)
// ===============================================

// Navegar al mes anterior
function consumosPrev() {
  const [year, month] = currentConsumosMes.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  currentConsumosMes = d.toISOString().slice(0, 7);
  console.log('Mes:', currentConsumosMes);
  renderConsumos();
}

// Navegar al mes siguiente
function consumosNext() {
  const [year, month] = currentConsumosMes.split('-').map(Number);
  const d = new Date(year, month, 1);
  currentConsumosMes = d.toISOString().slice(0, 7);
  console.log('Mes:', currentConsumosMes);
  renderConsumos();
}

// Renderizar vista de consumos
function renderConsumos() {
  const [year, month] = currentConsumosMes.split('-').map(Number);
  const mesLabel = new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  // Actualizar label del mes
  const labelEl = document.getElementById('consumos-mes-label');
  if (labelEl) labelEl.textContent = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  
  // Calcular gastos
  const gastos = calcGastosMes(currentConsumosMes);
  
  // Actualizar stats
  const totalEl = document.getElementById('consumo-total');
  const reservasEl = document.getElementById('consumo-reservas');
  const gestorEl = document.getElementById('consumo-gestor');
  const propietarioEl = document.getElementById('consumo-propietario');
  
  if (totalEl) totalEl.textContent = formatMoney(gastos.total);
  if (reservasEl) reservasEl.textContent = gastos.numReservas;
  if (gestorEl) gestorEl.textContent = formatMoney(gastos.gestor);
  if (propietarioEl) propietarioEl.textContent = formatMoney(gastos.propietario);
  
  // Desglose por artículo
  const desglose = document.getElementById('consumos-desglose');
  if (desglose) {
    if (gastos.desglose.length > 0) {
      desglose.innerHTML = gastos.desglose.map(g => `
        <div class="consumo-item">
          <div>
            <span class="consumo-nombre">${g.nombre}</span>
            <span class="consumo-pagador ${g.pagador}">${g.pagador === 'gestor' ? '🏢' : '👤'}</span>
          </div>
          <div>
            <span style="color:var(--text-muted);">${g.unidades} uds × ${formatMoney(g.precioUnitario)}</span>
            <span class="consumo-valor">${formatMoney(g.total)}</span>
          </div>
        </div>
      `).join('');
    } else {
      desglose.innerHTML = '<p style="color:var(--text-muted);">Sin consumos este mes</p>';
    }
  }
  
  // Proyección y gráfico
  renderProyeccion();
  renderConsumosChart();
}

// Calcular gastos del mes
function calcGastosMes(mes) {
  const [year, month] = mes.split('-').map(Number);
  const inicioMes = new Date(year, month - 1, 1);
  const finMes = new Date(year, month, 0, 23, 59, 59);
  
  let reservasMes = [];
  
  // Filtrar reservas por check_out en el mes
  if (S.reservas && S.reservas.length > 0) {
    reservasMes = S.reservas.filter(r => {
      if (r.status === 'cancelled') return false;
      const checkout = new Date(r.check_out);
      return checkout >= inicioMes && checkout <= finMes;
    });
  }
  
  // También incluir servicios de limpieza
  if (S.servicios && S.servicios.length > 0) {
    S.servicios.forEach(s => {
      if (s.estado === 'cancelado') return;
      const fecha = new Date(s.fecha_servicio);
      if (fecha >= inicioMes && fecha <= finMes) {
        // Verificar que no esté duplicado
        const existe = reservasMes.find(r => 
          r.propiedad_nombre === s.propiedad_nombre && 
          r.check_out === s.fecha_servicio
        );
        if (!existe) {
          reservasMes.push({
            propiedad_nombre: s.propiedad_nombre,
            num_huespedes: s.num_huespedes || 2,
            check_out: s.fecha_servicio
          });
        }
      }
    });
  }
  
  // Calcular consumos
  let total = 0, gestor = 0, propietario = 0;
  const desglose = [];
  const inventario = S.stock || S.inventario || [];
  
  for (const item of inventario) {
    let unidades = 0;
    
    for (const reserva of reservasMes) {
      unidades += calcConsumoReserva(item, reserva);
    }
    
    if (unidades > 0) {
      const precio = item.precio_unidad || 0;
      const subtotal = unidades * precio;
      const pagador = item.pagado_por || 'gestor';
      
      total += subtotal;
      if (pagador === 'gestor') gestor += subtotal;
      else propietario += subtotal;
      
      desglose.push({
        nombre: item.item,
        unidades: unidades,
        precioUnitario: precio,
        total: subtotal,
        pagador: pagador
      });
    }
  }
  
  return { total, gestor, propietario, numReservas: reservasMes.length, desglose };
}

// Calcular consumo de un item para una reserva
function calcConsumoReserva(item, reserva) {
  // Verificar si aplica a la propiedad
  const propIds = item.propiedades_ids || [];
  if (propIds.length > 0) {
    let match = false;
    
    if (reserva.propiedad_id && propIds.includes(reserva.propiedad_id)) {
      match = true;
    } else if (reserva.propiedad_nombre) {
      const prop = S.propiedades.find(p => 
        p.nombre === reserva.propiedad_nombre || 
        p.propiedad_nombre === reserva.propiedad_nombre
      );
      if (prop && propIds.includes(prop.id)) {
        match = true;
      }
    }
    
    if (!match) return 0;
  }
  
  // Obtener datos de propiedad
  let habitaciones = 1, banos = 1, camasDobles = 0, camasIndiv = 0;
  
  if (reserva.propiedad_nombre) {
    const prop = S.propiedades.find(p => p.propiedad_nombre === reserva.propiedad_nombre);
    if (prop) {
      habitaciones = prop.total_rooms || 1;
      banos = prop.total_bathrooms || 1;
      camasDobles = prop.total_camas_dobles || 0;
      camasIndiv = prop.total_camas_individuales || 0;
    }
  }
  
  const huespedes = reserva.num_huespedes || reserva.guests || 2;
  const adultos = reserva.num_adultos || reserva.adults || huespedes;
  const ninos = reserva.num_ninos || reserva.children || 0;
  const bebes = reserva.num_bebes || reserva.infants || 0;
  
  // Calcular consumo
  let consumo = 0;
  consumo += item.consumo_por_limpieza || 0;
  consumo += (item.consumo_habitacion || 0) * habitaciones;
  consumo += (item.consumo_bano || 0) * banos;
  consumo += (item.consumo_cama_doble || 0) * camasDobles;
  consumo += (item.consumo_cama_indiv || 0) * camasIndiv;
  consumo += (item.consumo_huesped || 0) * huespedes;
  consumo += (item.consumo_adulto || 0) * adultos;
  consumo += (item.consumo_nino || 0) * ninos;
  consumo += (item.consumo_bebe || 0) * bebes;
  
  return consumo;
}

// Renderizar proyección
function renderProyeccion() {
  const el = document.getElementById('consumos-proyeccion');
  if (!el) return;
  
  const today = new Date();
  const [year, month] = currentConsumosMes.split('-').map(Number);
  
  // Solo mostrar para mes actual
  if (year !== today.getFullYear() || month !== today.getMonth() + 1) {
    el.innerHTML = '<p style="color:var(--text-muted);">Proyección solo disponible para el mes actual</p>';
    return;
  }
  
  const finMes = new Date(year, month, 0, 23, 59, 59);
  
  // Reservas futuras del mes
  const futuras = (S.reservas || []).filter(r => {
    if (r.status === 'cancelled') return false;
    const checkout = new Date(r.check_out);
    return checkout > today && checkout <= finMes;
  });
  
  // Calcular proyección
  const inventario = S.stock || S.inventario || [];
  let proyeccion = 0;
  const items = [];
  
  for (const item of inventario) {
    let unidades = 0;
    for (const reserva of futuras) {
      unidades += calcConsumoReserva(item, reserva);
    }
    if (unidades > 0) {
      const subtotal = unidades * (item.precio_unidad || 0);
      proyeccion += subtotal;
      items.push({ nombre: item.item, unidades, total: subtotal });
    }
  }
  
  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Reservas pendientes mes</div>
        <div class="stat-value">${futuras.length}</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-label">Gasto proyectado restante</div>
        <div class="stat-value">${formatMoney(proyeccion)}</div>
      </div>
    </div>
    ${items.length > 0 ? `
      <div style="margin-top:12px;">
        <strong>Desglose proyectado:</strong>
        ${items.slice(0, 5).map(d => `
          <div style="display:flex; justify-content:space-between; padding:4px 0;">
            <span>${d.nombre} (${d.unidades} uds)</span>
            <span>${formatMoney(d.total)}</span>
          </div>
        `).join('')}
        ${items.length > 5 ? `<div style="color:var(--text-muted);">...y ${items.length - 5} más</div>` : ''}
      </div>
    ` : ''}
  `;
}

// Renderizar gráfico de tendencia
function renderConsumosChart() {
  const canvas = document.getElementById('consumos-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const [year, month] = currentConsumosMes.split('-').map(Number);
  const meses = [];
  const valores = [];
  
  // Últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('es-ES', { month: 'short' });
    meses.push(label);
    
    // Calcular sin log
    const gastos = calcGastosMesSilencioso(key);
    valores.push(gastos.total);
  }
  
  // Dimensiones
  const width = canvas.width = (canvas.parentElement?.offsetWidth - 40) || 400;
  const height = canvas.height = 200;
  const padding = 40;
  const maxVal = Math.max(...valores, 1);
  const barWidth = (width - padding * 2) / meses.length - 10;
  
  // Limpiar
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#1c1c26';
  ctx.fillRect(0, 0, width, height);
  
  // Dibujar barras
  meses.forEach((mes, i) => {
    const x = padding + i * ((width - padding * 2) / meses.length) + 5;
    const barHeight = (valores[i] / maxVal) * (height - padding * 2);
    const y = height - padding - barHeight;
    
    // Barra
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Etiqueta
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mes, x + barWidth / 2, height - 10);
    
    // Valor
    ctx.fillStyle = '#f4f4f5';
    ctx.fillText(valores[i].toFixed(0) + '€', x + barWidth / 2, y - 5);
  });
}

// Versión silenciosa para el gráfico (sin logs)
function calcGastosMesSilencioso(mes) {
  const [year, month] = mes.split('-').map(Number);
  const inicioMes = new Date(year, month - 1, 1);
  const finMes = new Date(year, month, 0, 23, 59, 59);
  
  let reservasMes = [];
  
  if (S.reservas && S.reservas.length > 0) {
    reservasMes = S.reservas.filter(r => {
      if (r.status === 'cancelled') return false;
      const checkout = new Date(r.check_out);
      return checkout >= inicioMes && checkout <= finMes;
    });
  }
  
  if (S.servicios && S.servicios.length > 0) {
    S.servicios.forEach(s => {
      if (s.estado === 'cancelado') return;
      const fecha = new Date(s.fecha_servicio);
      if (fecha >= inicioMes && fecha <= finMes) {
        const existe = reservasMes.find(r => 
          r.propiedad_nombre === s.propiedad_nombre && 
          r.check_out === s.fecha_servicio
        );
        if (!existe) {
          reservasMes.push({
            propiedad_nombre: s.propiedad_nombre,
            num_huespedes: s.num_huespedes || 2,
            check_out: s.fecha_servicio
          });
        }
      }
    });
  }
  
  let total = 0;
  const inventario = S.stock || S.inventario || [];
  
  for (const item of inventario) {
    let unidades = 0;
    for (const reserva of reservasMes) {
      unidades += calcConsumoReserva(item, reserva);
    }
    if (unidades > 0) {
      total += unidades * (item.precio_unidad || 0);
    }
  }
  
  return { total };
}
