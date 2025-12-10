# CleanManager Pro - Versión Modular

## Estructura de Archivos

```
cleanmanager-modular/
├── index.html          (HTML + CSS)
├── vercel.json         (config Vercel)
├── README.md           (este archivo)
└── js/
    ├── core.js         (Config, State, Auth, Nav, Utils)
    ├── renders.js      (Dashboard, Servicios, Kits, Props, etc.)
    ├── stock.js        (Inventario completo)
    ├── consumos.js     (Cálculos de consumo mensual)
    ├── saves.js        (Funciones de guardado)
    ├── integraciones.js(PMS y sincronización)
    └── alertas.js      (Alertas, Informes, Forecasts, Limpiezas)
```

## Descripción de cada archivo

### `core.js` (~394 líneas)
- **Config**: `API`, `TBL`, `PLATFORMS`
- **State**: `S` (estado global)
- **Init**: `initApp()`, `loadAll()`, `DOMContentLoaded`
- **Auth**: `doLogin()`, `doRegister()`, `logout()`
- **Nav**: `navigate()`, `renderView()`, `toggleSidebar()`
- **Utils**: `$()`, `$$()`, `openModal()`, `closeModal()`, `toast()`, `formatMoney()`, `formatDate()`

### `renders.js` (~270 líneas)
- `renderDashboard()`
- `renderServicios()`
- `renderReservas()`
- `renderKits()`
- `renderPropiedades()`
- `renderPropietarios()`
- `renderEmpleados()`
- `renderExtras()`
- `renderMantenimiento()`
- `renderGastos()`

### `stock.js` (~247 líneas)
- `renderStock()`
- `openStockModal()`
- `renderStockPropsCheckboxes()`
- `toggleAllStockProps()`
- `getSelectedStockProps()`
- `saveStock()`
- `deleteStock()`
- `adjStock()`
- `editStock()`

### `consumos.js` (~284 líneas)
- `renderConsumos()`
- `changeConsumosMes()`
- `calcGastosMes()`
- `calcConsumoReserva()`
- `renderProyeccion()`
- `renderConsumosChart()`

### `saves.js` (~265 líneas)
- `saveServicio()`
- `savePropiedad()`
- `savePropietario()`
- `saveEmpleado()`
- `saveExtra()`
- `saveGasto()`
- `saveAlertConfig()`
- `editServicio()`
- `completarServicio()`
- `delExtra()`
- `delGasto()`

### `integraciones.js` (~372 líneas)
- `loadIntegraciones()`
- `renderIntegraciones()`
- `syncReservas()`
- `saveCredenciales()`
- `deleteCredenciales()`
- `renderPropsImportadas()`
- `savePropMapping()`

### `alertas.js` (~537 líneas)
- `calculateForecasts()`
- `updateForecastBadges()`
- `renderLimpiezasMes()`
- `changeMonth()`
- `renderInformes()`
- `generarInformePDF()`
- `exportarExcel()`
- `loadAlertConfig()`
- `saveAlertConfig()`
- `renderAlertas()`
- `renderAlertasEstado()`
- Overrides de `initApp` y `navigate` para nuevas vistas

## Orden de carga (importante)

Los scripts deben cargarse en este orden:
1. `core.js` - Define constantes globales y funciones base
2. `renders.js` - Funciones de renderizado
3. `stock.js` - Módulo de inventario
4. `consumos.js` - Módulo de consumos
5. `saves.js` - Funciones de guardado
6. `integraciones.js` - Módulo de integraciones
7. `alertas.js` - Último, porque hace override de `initApp` y `navigate`

## Cómo modificar

Para hacer cambios, solo edita el archivo relevante:

- **Cambiar estilos**: `index.html`
- **Cambiar cálculo de consumos**: `consumos.js`
- **Cambiar inventario/stock**: `stock.js`
- **Cambiar alertas o informes**: `alertas.js`
- **Cambiar integraciones PMS**: `integraciones.js`
- **Cambiar lógica de guardado**: `saves.js`
- **Cambiar autenticación**: `core.js`

## Deploy en Vercel

1. Sube la carpeta completa a GitHub
2. Conecta el repo a Vercel
3. Deploy automático

O usa Vercel CLI:
```bash
vercel --prod
```
