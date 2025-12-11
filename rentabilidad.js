// ===============================================
// RENTABILIDAD - Cálculo de ingresos y gastos
// ===============================================

// Variables globales para rentabilidad
let currentRentabilidadMes = new Date().toISOString().slice(0, 7);
let currentRentabilidadPropiedad = '';

// Helper para YYYY-MM
function monthKeyRent(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE RENTABILIDAD PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

function calcRentabilidadMes(mes, propiedadId = null) {
    const [year, month] = mes.split('-').map(Number);
    const inicioMes = new Date(year, month - 1, 1);
    const finMes = new Date(year, month, 0, 23, 59, 59);

    // Filtrar reservas del mes
    let reservasMes = (S.reservas || []).filter(r => {
        if (r.status === 'cancelled') return false;
        const checkout = new Date(r.check_out);
        const matchesMes = checkout >= inicioMes && checkout <= finMes;
        const matchesPropiedad = !propiedadId || r.propiedad_id === propiedadId || r.propiedad_nombre === propiedadId;
        return matchesMes && matchesPropiedad;
    });

    // INGRESOS
    const ingresosBrutos = reservasMes.reduce((sum, r) => sum + (r.precio || r.precio_total || 0), 0);
    const numReservas = reservasMes.length;
    const numNoches = reservasMes.reduce((sum, r) => {
        const cin = new Date(r.check_in);
        const cout = new Date(r.check_out);
        return sum + Math.ceil((cout - cin) / (1000 * 60 * 60 * 24));
    }, 0);

    // GASTOS - Comisiones PMS
    const gastoComisiones = calcComisionesPMS(reservasMes, propiedadId);

    // GASTOS - Limpieza (desde servicios o un precio fijo por propiedad)
    const gastoLimpieza = calcGastoLimpieza(reservasMes, propiedadId);

    // GASTOS - Amenities (usando el sistema existente de consumos)
    const gastosConsumos = calcGastosMes(mes);
    let gastoAmenities = 0;
    if (propiedadId) {
        // Filtrar solo para esta propiedad
        const prop = S.propiedades.find(p => p.id === propiedadId || p.propiedad_nombre === propiedadId);
        if (prop) {
            gastoAmenities = gastosConsumos.desglose
                .filter(d => {
                    // Verificar si el item aplica a esta propiedad
                    const item = S.inventario.find(i => i.item === d.nombre);
                    if (!item) return false;
                    const propIds = item.propiedades_ids || [];
                    return propIds.length === 0 || propIds.includes(prop.id);
                })
                .reduce((sum, d) => sum + d.total, 0);
        }
    } else {
        gastoAmenities = gastosConsumos.total;
    }

    // GASTOS - Gastos recurrentes (luz, agua, comunidad...)
    const gastosRecurrentes = calcGastosRecurrentes(mes, propiedadId);

    // GASTOS - Gastos extra/extraordinarios
    const gastosExtraordinarios = calcGastosExtraordinarios(mes, propiedadId);

    // TOTALES
    const gastosTotales = gastoComisiones + gastoLimpieza + gastoAmenities +
        gastosRecurrentes.total + gastosExtraordinarios.total;
    const beneficioNeto = ingresosBrutos - gastosTotales;
    const margen = ingresosBrutos > 0 ? (beneficioNeto / ingresosBrutos) * 100 : 0;

    // REPARTO propietario/gestor
    const reparto = calcRepartoPropietarioGestor(beneficioNeto, ingresosBrutos, propiedadId);

    // Calcular ocupación
    const diasMes = finMes.getDate();
    const ocupacion = diasMes > 0 ? (numNoches / diasMes) * 100 : 0;

    return {
        // Período
        mes,
        año: year,
        mesNum: month,

        // Ingresos
        ingresosBrutos,
        numReservas,
        numNoches,
        ocupacion,
        ticketMedio: numReservas > 0 ? ingresosBrutos / numReservas : 0,
        revPAR: diasMes > 0 ? ingresosBrutos / diasMes : 0,

        // Gastos desglosados
        gastoComisiones,
        gastoLimpieza,
        gastoAmenities,
        gastoSuministros: gastosRecurrentes.suministros,
        gastoComunidad: gastosRecurrentes.comunidad,
        gastoSeguros: gastosRecurrentes.seguros,
        gastoMantenimiento: gastosExtraordinarios.mantenimiento,
        gastoOtros: gastosRecurrentes.otros + gastosExtraordinarios.otros,

        // Totales
        gastosTotales,
        beneficioNeto,
        margen,

        // Reparto
        pagoPropietario: reparto.propietario,
        beneficioGestor: reparto.gestor,

        // Detalles
        detalleGastosRecurrentes: gastosRecurrentes.detalle,
        detalleGastosExtra: gastosExtraordinarios.detalle,
        reservas: reservasMes
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE COMISIONES PMS
// ═══════════════════════════════════════════════════════════════════════════

function calcComisionesPMS(reservas, propiedadId = null) {
    let totalComisiones = 0;

    for (const reserva of reservas) {
        // Determinar la plataforma/fuente
        const fuente = detectarFuenteReserva(reserva);

        // Buscar comisión configurada
        const comision = S.comisiones.find(c => {
            if (!c.activo) return false;
            if (c.plataforma !== fuente) return false;

            // Verificar si aplica a la propiedad
            if (c.propiedad_id) {
                return c.propiedad_id === propiedadId || c.propiedad_id === reserva.propiedad_id;
            }
            return true; // Comisión general
        });

        if (comision) {
            const precio = reserva.precio || reserva.precio_total || 0;

            if (comision.tipo_comision === 'porcentaje') {
                totalComisiones += precio * (comision.porcentaje / 100);
            } else if (comision.tipo_comision === 'fijo') {
                totalComisiones += comision.importe_fijo || 0;
            }
        }
    }

    return totalComisiones;
}

function detectarFuenteReserva(reserva) {
    // Primero intentar con el campo explícito
    if (reserva.fuente) return reserva.fuente.toLowerCase();

    // Detectar por origen o partner_name
    const origen = (reserva.origen || '').toLowerCase();
    const partner = (reserva.partner_name || '').toLowerCase();

    if (partner.includes('booking')) return 'booking';
    if (partner.includes('airbnb')) return 'airbnb';
    if (partner.includes('vrbo') || partner.includes('homeaway')) return 'vrbo';

    if (origen === 'avaibook' || origen === 'icnea' || origen === 'hostify') return 'pms';
    if (origen) return origen;

    return 'directo';
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE GASTOS DE LIMPIEZA
// ═══════════════════════════════════════════════════════════════════════════

function calcGastoLimpieza(reservas, propiedadId = null) {
    // Opción 1: Usar precio de limpieza configurado en la propiedad
    if (propiedadId) {
        const prop = S.propiedades.find(p => p.id === propiedadId || p.propiedad_nombre === propiedadId);
        if (prop && prop.precio_limpieza) {
            return reservas.length * prop.precio_limpieza;
        }
    }

    // Opción 2: Sumar servicios de limpieza del mes
    // (esto ya se podría considerar en gastos extraordinarios o aparte)
    return 0; // Por ahora, asumimos que está incluido en el precio de la reserva
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE GASTOS RECURRENTES (Luz, agua, comunidad...)
// ═══════════════════════════════════════════════════════════════════════════

function calcGastosRecurrentes(mes, propiedadId = null) {
    const [year, month] = mes.split('-').map(Number);
    const inicioMes = new Date(year, month - 1, 1);
    const finMes = new Date(year, month, 0);

    let total = 0;
    let suministros = 0;
    let comunidad = 0;
    let seguros = 0;
    let otros = 0;
    const detalle = [];

    for (const gasto of S.gastosRecurrentes || []) {
        if (!gasto.activo) continue;

        // Verificar si aplica a la propiedad
        if (propiedadId && gasto.propiedad_id && gasto.propiedad_id !== propiedadId) {
            continue;
        }

        // Verificar si aplica en este mes (fecha_inicio y fecha_fin)
        const fechaInicio = new Date(gasto.fecha_inicio);
        const fechaFin = gasto.fecha_fin ? new Date(gasto.fecha_fin) : null;

        if (fechaInicio > finMes) continue;
        if (fechaFin && fechaFin < inicioMes) continue;

        // Calcular importe prorrateado según periodicidad
        let importeMes = 0;
        const importe = gasto.importe || 0;

        switch (gasto.periodicidad) {
            case 'mensual':
                importeMes = importe;
                break;
            case 'bimestral':
                importeMes = importe / 2;
                break;
            case 'trimestral':
                importeMes = importe / 3;
                break;
            case 'anual':
                importeMes = gasto.prorratear ? importe / 12 : 0;
                // Si no prorratear, solo cobrar en el mes específico
                if (!gasto.prorratear && new Date(year, month - 1, gasto.dia_cargo || 1) >= inicioMes &&
                    new Date(year, month - 1, gasto.dia_cargo || 1) <= finMes) {
                    importeMes = importe;
                }
                break;
            case 'unico':
                // Solo cobrar si la fecha de inicio está en este mes
                if (fechaInicio >= inicioMes && fechaInicio <= finMes) {
                    importeMes = importe;
                }
                break;
            default:
                importeMes = importe;
        }

        if (importeMes > 0) {
            total += importeMes;

            // Clasificar por categoría
            switch (gasto.categoria) {
                case 'suministros':
                    suministros += importeMes;
                    break;
                case 'comunidad':
                    comunidad += importeMes;
                    break;
                case 'seguros':
                    seguros += importeMes;
                    break;
                default:
                    otros += importeMes;
            }

            detalle.push({
                nombre: gasto.nombre,
                categoria: gasto.categoria,
                importe: importeMes,
                periodicidad: gasto.periodicidad,
                pagadoPor: gasto.pagado_por
            });
        }
    }

    return { total, suministros, comunidad, seguros, otros, detalle };
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE GASTOS EXTRAORDINARIOS
// ═══════════════════════════════════════════════════════════════════════════

function calcGastosExtraordinarios(mes, propiedadId = null) {
    const [year, month] = mes.split('-').map(Number);
    const mesKey = `${year}-${String(month).padStart(2, '0')}`;

    let total = 0;
    let mantenimiento = 0;
    let otros = 0;
    const detalle = [];

    for (const gasto of S.gastosExtra || []) {
        if (!gasto.fecha || !gasto.fecha.startsWith(mesKey)) continue;

        // Verificar si aplica a la propiedad
        if (propiedadId && gasto.propiedad_id && gasto.propiedad_id !== propiedadId) {
            continue;
        }

        const importe = gasto.importe || 0;
        total += importe;

        if (gasto.categoria === 'mantenimiento') {
            mantenimiento += importe;
        } else {
            otros += importe;
        }

        detalle.push({
            fecha: gasto.fecha,
            concepto: gasto.concepto,
            categoria: gasto.categoria,
            importe: importe,
            pagadoPor: gasto.pagado_por
        });
    }

    return { total, mantenimiento, otros, detalle };
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE REPARTO PROPIETARIO/GESTOR
// ═══════════════════════════════════════════════════════════════════════════

function calcRepartoPropietarioGestor(beneficioNeto, ingresosBrutos, propiedadId = null) {
    // Buscar configuración de reparto para esta propiedad
    let config = S.repartoIngresos.find(r => {
        if (!r.activo) return false;
        return r.propiedad_id === propiedadId;
    });

    // Si no hay config específica, usar la general (propiedad_id = null)
    if (!config) {
        config = S.repartoIngresos.find(r => r.activo && !r.propiedad_id);
    }

    // Si no hay configuración, asumir 70% propietario, 30% gestor
    if (!config) {
        const pagoPropietario = beneficioNeto * 0.70;
        return {
            propietario: pagoPropietario,
            gestor: beneficioNeto - pagoPropietario
        };
    }

    let pagoPropietario = 0;

    switch (config.modelo) {
        case 'porcentaje':
            const base = config.calcular_sobre === 'bruto' ? ingresosBrutos : beneficioNeto;
            pagoPropietario = base * (config.porcentaje_propietario / 100);
            break;

        case 'fijo_noche':
            // Necesitaríamos el número de noches, lo calculamos si es necesario
            pagoPropietario = 0; // Por implementar si se usa este modelo
            break;

        case 'fijo_reserva':
            // Necesitaríamos el número de reservas
            pagoPropietario = 0; // Por implementar si se usa este modelo
            break;

        case 'neto':
            pagoPropietario = beneficioNeto; // Todo para el propietario
            break;

        default:
            pagoPropietario = beneficioNeto * 0.70;
    }

    return {
        propietario: pagoPropietario,
        gestor: beneficioNeto - pagoPropietario
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZAR VISTA DE RENTABILIDAD
// ═══════════════════════════════════════════════════════════════════════════

function renderRentabilidad() {
    // Actualizar selector de mes
    const mesLabel = new Date(currentRentabilidadMes + '-01').toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
    });

    const labelEl = document.getElementById('rent-mes-label');
    if (labelEl) labelEl.textContent = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

    // Poblar selector de propiedades
    const propSelect = document.getElementById('rent-propiedad-sel');
    if (propSelect && S.propiedades) {
        const currentValue = propSelect.value;
        propSelect.innerHTML = '<option value="">Todas las propiedades</option>' +
            S.propiedades.map(p => `<option value="${p.id || p.propiedad_nombre}">${p.propiedad_nombre || p.nombre}</option>`).join('');
        if (currentValue) propSelect.value = currentValue;
        currentRentabilidadPropiedad = propSelect.value;
    }

    // Calcular rentabilidad
    const rent = calcRentabilidadMes(currentRentabilidadMes, currentRentabilidadPropiedad || null);

    // Actualizar cards de resumen
    document.getElementById('rent-ingresos-brutos').textContent = formatMoney(rent.ingresosBrutos);
    document.getElementById('rent-gastos-totales').textContent = formatMoney(rent.gastosTotales);
    document.getElementById('rent-beneficio-neto').textContent = formatMoney(rent.beneficioNeto);
    document.getElementById('rent-margen').textContent = rent.margen.toFixed(1) + '%';
    document.getElementById('rent-num-reservas').textContent = rent.numReservas;
    document.getElementById('rent-ocupacion').textContent = rent.ocupacion.toFixed(1) + '%';
    document.getElementById('rent-pago-propietario').textContent = formatMoney(rent.pagoPropietario);
    document.getElementById('rent-beneficio-gestor').textContent = formatMoney(rent.beneficioGestor);

    // Renderizar desglose de gastos
    renderDesgloseGastos(rent);

    // Renderizar tabla de reservas
    renderTablaReservas(rent.reservas);

    // Renderizar gráfico de evolución
    renderGraficoEvolucion();
}

function renderDesgloseGastos(rent) {
    const container = document.getElementById('rent-desglose-gastos');
    if (!container) return;

    const gastos = [
        { label: 'Comisiones PMS', valor: rent.gastoComisiones, icon: '💳' },
        { label: 'Limpieza', valor: rent.gastoLimpieza, icon: '🧹' },
        { label: 'Amenities', valor: rent.gastoAmenities, icon: '🧴' },
        { label: 'Suministros', valor: rent.gastoSuministros, icon: '💡' },
        { label: 'Comunidad', valor: rent.gastoComunidad, icon: '🏢' },
        { label: 'Seguros', valor: rent.gastoSeguros, icon: '🛡️' },
        { label: 'Mantenimiento', valor: rent.gastoMantenimiento, icon: '🔧' },
        { label: 'Otros', valor: rent.gastoOtros, icon: '📎' }
    ].filter(g => g.valor > 0);

    container.innerHTML = gastos.map(g => `
    <div class="consumo-item">
      <div>
        <span>${g.icon} ${g.label}</span>
      </div>
      <span class="consumo-valor">${formatMoney(g.valor)}</span>
    </div>
  `).join('');
}

function renderTablaReservas(reservas) {
    const tbody = document.getElementById('rent-reservas-tbody');
    if (!tbody) return;

    if (!reservas || reservas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Sin reservas este mes</td></tr>';
        return;
    }

    tbody.innerHTML = reservas.map(r => {
        const fuente = detectarFuenteReserva(r);
        const precio = r.precio || r.precio_total || 0;
        return `
      <tr>
        <td>${formatDate(r.check_in)} - ${formatDate(r.check_out)}</td>
        <td>${r.propiedad_nombre || '-'}</td>
        <td>${r.huesped_nombre || 'Huésped'}</td>
        <td><span class="badge badge-neutral">${fuente}</span></td>
        <td><strong>${formatMoney(precio)}</strong></td>
      </tr>
    `;
    }).join('');
}

function renderGraficoEvolucion() {
    const canvas = document.getElementById('rent-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [year, month] = currentRentabilidadMes.split('-').map(Number);
    const meses = [];
    const beneficios = [];

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const key = monthKeyRent(d);
        const label = d.toLocaleDateString('es-ES', { month: 'short' });
        meses.push(label);

        const rent = calcRentabilidadMes(key, currentRentabilidadPropiedad || null);
        beneficios.push(rent.beneficioNeto);
    }

    // Dimensiones
    const width = canvas.width = (canvas.parentElement?.offsetWidth - 40) || 600;
    const height = canvas.height = 250;
    const padding = 50;

    // Limpiar
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(0, 0, width, height);

    // Encontrar min/max para escala
    const maxVal = Math.max(...beneficios, 100);
    const minVal = Math.min(...beneficios, 0);
    const range = maxVal - minVal;

    // Dibujar línea de referencia en cero
    if (minVal < 0) {
        const y0 = height - padding - ((0 - minVal) / range) * (height - padding * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, y0);
        ctx.lineTo(width - padding, y0);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Dibujar línea de beneficios
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const stepX = (width - padding * 2) / (meses.length - 1);

    meses.forEach((mes, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((beneficios[i] - minVal) / range) * (height - padding * 2);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Dibujar puntos y valores
    meses.forEach((mes, i) => {
        const x = padding + i * stepX;
        const y = height - padding - ((beneficios[i] - minVal) / range) * (height - padding * 2);

        // Punto
        ctx.fillStyle = beneficios[i] >= 0 ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Etiqueta de mes
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mes, x, height - 15);

        // Valor
        ctx.fillStyle = '#f4f4f5';
        ctx.fillText(Math.round(beneficios[i]) + '€', x, y - 10);
    });
}

// Navegación de mes
function rentPrev() {
    const [year, month] = currentRentabilidadMes.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    d.setMonth(d.getMonth() - 1);
    currentRentabilidadMes = monthKeyRent(d);
    renderRentabilidad();
}

function rentNext() {
    const [year, month] = currentRentabilidadMes.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    d.setMonth(d.getMonth() + 1);
    currentRentabilidadMes = monthKeyRent(d);
    renderRentabilidad();
}

function rentChangeProp() {
    const sel = document.getElementById('rent-propiedad-sel');
    if (sel) {
        currentRentabilidadPropiedad = sel.value;
        renderRentabilidad();
    }
}
