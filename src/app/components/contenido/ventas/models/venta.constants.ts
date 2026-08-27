// Alias: este archivo ya exporta su propio tipo/const `TipoComprobante` (ids de
// comprobante fiscal internos, distinto de este enum). Se importa con otro
// nombre para no chocar - ver tieneNotaFiscal/tieneNotaInterna más abajo.
import { TipoComprobante as TipoComprobanteAfip } from '../../../../models/ObjFacturar';

/**
 * Helper genérico:
 * Permite obtener un union type a partir de un objeto const.
 *
 * Ejemplo:
 * { A: 1, B: 2 } -> 1 | 2
 */
type ValueOf<T> = T[keyof T];

/**
 * IDs de métodos de pago.
 */
export const METODO_PAGO = {
  SALDO_A_FAVOR: 13,
  CUENTA_CORRIENTE: 12,
} as const;                             

export type MetodoPagoId = ValueOf<typeof METODO_PAGO>;

/**
 * IDs de tipos de comprobante AFIP.
 *
 * 99 es un ID interno para operaciones
 * sin comprobante fiscal real.
 */
export const TIPO_COMPROBANTE = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  SIN_COMPROBANTE: 99,
  // Nota de Crédito interna (no fiscal, no pasa por AFIP/ARCA). Mismo id que
  // TipoComprobante.NC_X en el backend (objFacturar.ts) - no cambiar sin migración.
  NC_X: 100,
  // Nota de Débito interna (no fiscal, no pasa por AFIP/ARCA) - análoga a NC_X
  // pero genera saldo deudor. Mismo id que TipoComprobante.ND_X en el backend
  // (objFacturar.ts) - no cambiar sin migración.
  ND_X: 101,
} as const;

export type TipoComprobante = ValueOf<typeof TIPO_COMPROBANTE>;

/**
 * IDs de condición IVA del cliente.
 */
export const CONDICION_IVA = {
  RESPONSABLE_INSCRIPTO: 1,
  CONSUMIDOR_FINAL: 5,
  MONOTRIBUTO: 6,
  MONOTRIBUTO_SOCIAL: 13,
  IVA_NO_ALCANZADO: 15,
  EXENTO: 4,
  SIN_CLIENTE: 99,
} as const;

export type CondicionIva = ValueOf<typeof CONDICION_IVA>;

/**
 * IDs de categoría de cliente.
 */
export const CATEGORIA_CLIENTE = {
  MINORISTA: 1,
  MAYORISTA: 2,
} as const;

export type CategoriaCliente = ValueOf<typeof CATEGORIA_CLIENTE>;

/**
 * Condición fiscal de la empresa emisora.
 */
export const CONDICION_EMPRESA = {
  RESPONSABLE_INSCRIPTO: 'RI',
  MONOTRIBUTO: 'MONO',
} as const;

export type CondicionEmpresa =
  ValueOf<typeof CONDICION_EMPRESA>;

/**
 * IDs internos de procesos de venta.
 */
export const ID_PROCESO = {
  FACTURA: 1,
  COTIZACION: 2,
  NOTA_CREDITO: 3,
  NOTA_DEBITO: 4,
  PRESUPUESTO: 5,
  PEDIDO: 6,
  NOTA_EMPAQUE: 7,
} as const;

export type IdProceso = ValueOf<typeof ID_PROCESO>;

/**
 * Sigla de documento comercial (ver documento-comercial.service.ts) para Presupuesto/
 * Pedido/Nota de Empaque - mismo criterio que las siglas de comprobante fiscal (A/B/C/
 * NC/ND), pero para estos 3 procesos que todavía no pasan por AFIP.
 */
export const SIGLA_DOCUMENTO_COMERCIAL: Partial<Record<IdProceso, string>> = {
  [ID_PROCESO.PRESUPUESTO]:  'PRE',
  [ID_PROCESO.PEDIDO]:       'PED',
  [ID_PROCESO.NOTA_EMPAQUE]: 'NDE',
} as const;

/**
 * Origen del `idProducto` de cada línea de venta (columna `ventas_productos.tipoItem`).
 * Se persiste en BD, no cambiar los valores sin migración. Espejo de TipoItemVenta
 * en el backend (ventaEstados.ts).
 *
 * `idProducto` es una FK polimórfica: puede apuntar a `productos` (catálogo real) o a
 * `productos_presupuesto` (ítems libres). Antes se adivinaba mirando el proceso de la
 * venta, heurística que se rompía justo al facturar un Presupuesto (la venta deja de
 * ser presupuesto pero las líneas siguen apuntando a la otra tabla).
 *
 * Un ítem PRESUPUESTO no mueve stock y no tiene talles ni color. SÍ entra en el
 * descuento general de la venta: como `productos_presupuesto` no tiene columna
 * topeDescuento, cae al fallback de descuento pleno (ver TopeDescuentoDe en
 * addmod-ventas). Decisión del usuario (ago-2026), que revierte una anterior del mismo
 * mes en la que estos ítems iban forzados a tope 0.
 */
export const TIPO_ITEM = {
  CATALOGO: 'CATALOGO',
  PRESUPUESTO: 'PRESUPUESTO',
} as const;

export type TipoItem = ValueOf<typeof TIPO_ITEM>;

/** true si la línea NO es del catálogo real (sin stock, sin talles, sin descuento). */
export function esItemNoCatalogado(tipoItem?: string | null): boolean {
  return tipoItem === TIPO_ITEM.PRESUPUESTO;
}

/**
 * Fiscal (pide CAE a ARCA) vs Interna/NC X (no pasa por ARCA, no anula ni
 * modifica la venta original). Ver notas-venta.component.ts.
 */
export type TipoNotaCredito = 'FISCAL' | 'INTERNA';

const COMPROBANTES_NC_FISCAL = new Set<number>([
  TipoComprobanteAfip.NC_A,
  TipoComprobanteAfip.NC_B,
  TipoComprobanteAfip.NC_C,
]);

/**
 * true si entre las NC ya emitidas sobre una venta (venta.notas, ver
 * ObtenerNotasVenta en el backend) hay alguna fiscal (NC A/B/C). Se usa para
 * bloquear una segunda NC fiscal sobre la misma venta - la interna sí se
 * puede seguir emitiendo (ago-2026, pedido del cliente: puede querer las dos,
 * solo no repetir el mismo tipo).
 */
export function tieneNotaFiscal(notas?: Array<{ idTipoComprobante?: number }>): boolean {
  return !!notas?.some(n => COMPROBANTES_NC_FISCAL.has(n.idTipoComprobante!));
}

/** Análogo a tieneNotaFiscal, para la NC interna (X). */
export function tieneNotaInterna(notas?: Array<{ idTipoComprobante?: number }>): boolean {
  return !!notas?.some(n => n.idTipoComprobante === TipoComprobanteAfip.NC_X);
}

/**
 * IDs internos de condiciones de pago.
 */
export const ID_CONDICION_PAGO = {
  CONTADO: 1,
  CUENTA_CORRIENTE: 2,
  PAGO_DIGITAL: 3,
  OTRO: 4,
} as const;
export type idCondicionPago = ValueOf<typeof ID_CONDICION_PAGO>;

/**
 * Strings que identifican el tipo de proceso relacionado a una venta.
 * Se persisten en BD, no cambiar los valores sin migración.
 */
export const TIPO_RELACIONADO = {
  PRESUPUESTO:  'PRESUPUESTO',
  PEDIDO:       'PEDIDO',
  NOTA_EMPAQUE: 'NOTA DE EMPAQUE',
} as const;

export type TipoRelacionado = ValueOf<typeof TIPO_RELACIONADO>;

/**
 * Strings que identifican el estado relacionado a una factura enviada.
 * COTIZACION es un estado interno para saber si el boton facturar debe pasar la venta a facturar o solo cerrar
 */
export const ESTADO_FACTURA = {
  APROBADO:  'Aprobado',
  COTIZACION:'Cotizacion'
} as const;

export type EstadoFactura = ValueOf<typeof ESTADO_FACTURA>;

//Maximo de talles disponibles
export const MAX_TALLES = 10;

//Escala fija de talles t1..t10 mostrada como header en las grillas de venta/recepción/stock por talla
export const TALLES_ESTANDAR: string[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];

/**
 * Comprobante por defecto según
 * condición IVA del cliente.
 *
 * Ejemplo:
 * Consumidor Final -> Factura B
 */
export const COMPROBANTE_POR_CONDICION_IVA:
  Record<CondicionIva, TipoComprobante> = {

  [CONDICION_IVA.RESPONSABLE_INSCRIPTO]:
    TIPO_COMPROBANTE.FACTURA_A,

  [CONDICION_IVA.CONSUMIDOR_FINAL]:
    TIPO_COMPROBANTE.FACTURA_B,

  [CONDICION_IVA.MONOTRIBUTO]:
    TIPO_COMPROBANTE.FACTURA_A,

  [CONDICION_IVA.MONOTRIBUTO_SOCIAL]:
    TIPO_COMPROBANTE.FACTURA_A,

  // RI→Exento = Factura B (regla AFIP estándar: A solo aplica si el receptor
  // también es RI/Mono/MonoSocial). Corregido jul-2026 - se había asumido por
  // error que Exento se facturaba igual que Responsable Inscripto (Factura A).
  // Cuando la empresa emisora es Mono, PrepararFacturacionCliente fuerza
  // Factura C sin importar la condición del cliente.
  [CONDICION_IVA.EXENTO]:
    TIPO_COMPROBANTE.FACTURA_B,

  [CONDICION_IVA.IVA_NO_ALCANZADO]:
    TIPO_COMPROBANTE.FACTURA_B,

  [CONDICION_IVA.SIN_CLIENTE]:
    TIPO_COMPROBANTE.FACTURA_B,
} as const;

/**
 * IDs de listas de precio.
 *
 * LISTA_3 (35%, "Lista 3.5" en el nombre de negocio) se eliminó ago-2026 -
 * confirmado sin clientes ni ventas/presupuestos/facturas históricas antes de
 * sacarla (ver Diagnostico impacto Lista 3.5 - ago-2026.sql). El id 3 queda
 * hueco a propósito: no se renumeran LISTA_4/5/6 para no tener que migrar los
 * clientes/ventas ya persistidos con esos ids.
 */
export const LISTA_PRECIO = {
  CONSUMIDOR_FINAL: 1,
  LISTA_2: 2,
  LISTA_4: 4,
  LISTA_5: 5,
  LISTA_6: 6,
} as const;

export type IdListaPrecio = ValueOf<typeof LISTA_PRECIO>;

/**
 * Multiplicadores de precio según lista asignada.
 *
 * Ejemplo: 0.70 = 30% descuento.
 *
 * OJO: esto queda vigente SOLO para nota-credito-x.component.ts (calcularPrecioCliente),
 * que todavía no tiene columna "Desc. %" por ítem y sigue horneando el descuento
 * directo en el precio. Para Presupuesto/Pedido/Factura (addmod-ventas) el descuento
 * de lista dejó de calcularse así (ago-2026, ver LISTA_PRECIO_CONFIG más abajo) -
 * no reintroducir este multiplicador ahí.
 */
export const MULTIPLICADOR_LISTA_PRECIO: Record<IdListaPrecio, number> = {
  [LISTA_PRECIO.CONSUMIDOR_FINAL]: 1.00,
  [LISTA_PRECIO.LISTA_2]: 0.70,
  [LISTA_PRECIO.LISTA_4]: 0.60,
  [LISTA_PRECIO.LISTA_5]: 0.55,
  [LISTA_PRECIO.LISTA_6]: 0.50,
} as const;

/**
 * Descuento (%) por lista de precio, para Presupuesto/Pedido/Factura
 * (addmod-ventas.component.ts) - ago-2026.
 *
 * Reemplaza, para estos 3 procesos, al esquema de multiplicador-sobre-precio:
 * en vez de hornear el % directo en `unitario` (invisible en el resumen), se
 * precarga en el mismo campo `descuentoManual` que ya usa la columna "Desc. %"
 * por ítem - así el descuento de lista queda visible igual que cualquier otro
 * (Precio bruto - Descuento + IVA). `unitario` deja de depender de la lista:
 * siempre es el precio de catálogo bruto (ver AplicarDescuentoDeLista).
 *
 * `editable: false` (Lista 4.0/4.5/5.0): el % se fuerza siempre en cada ítem,
 * no se puede desactivar ni cambiar, y el descuento general de cabecera queda
 * bloqueado en cuanto hay ítems cargados (mecanismo ya existente, hayDescuentoPorItem).
 *
 * `editable: true` (Lista 3.0, hoy la única): el % se precarga como sugerido
 * pero el usuario lo puede cambiar libremente por producto, dentro del rango
 * [DESCUENTO_LISTA_EDITABLE_MIN_DEFAULT, DESCUENTO_LISTA_EDITABLE_MAX_DEFAULT]
 * (parametrizable vía tabla `parametros`, claves CLAVE_PARAMETRO_DESCUENTO_LISTA_MIN/MAX
 * - ver parametros.service.ts). Estos clientes además NUNCA pueden usar el
 * descuento general de cabecera, ni siquiera antes de cargar ítems (decisión
 * del usuario, ago-2026) - ver listaPrecioBloqueaDescuentoGeneral.
 *
 * Consumidor Final no tiene entrada acá: sin descuento de lista, comportamiento
 * sin cambios.
 */
export const LISTA_PRECIO_CONFIG: Partial<Record<IdListaPrecio, { descuento: number; editable: boolean }>> = {
  [LISTA_PRECIO.LISTA_2]: { descuento: 30, editable: true },
  [LISTA_PRECIO.LISTA_4]: { descuento: 40, editable: false },
  [LISTA_PRECIO.LISTA_5]: { descuento: 45, editable: false },
  [LISTA_PRECIO.LISTA_6]: { descuento: 50, editable: false },
} as const;

/** true si la lista del cliente permite editar el % por ítem (hoy solo Lista 3.0). */
export function listaPrecioEditablePorItem(idListaPrecio?: number | null): boolean {
  if (idListaPrecio == null) return false;
  return LISTA_PRECIO_CONFIG[idListaPrecio as IdListaPrecio]?.editable === true;
}

/**
 * true si la lista del cliente prohíbe el descuento general de cabecera, incondicionalmente
 * (no solo cuando ya hay % cargado por ítem, a diferencia de hayDescuentoPorItem). Aplica a
 * TODA lista con entrada en LISTA_PRECIO_CONFIG (fija o editable), no solo a Lista 3.0.
 *
 * CORRECCIÓN (ago-2026, bug reportado): antes esto devolvía lo mismo que
 * listaPrecioEditablePorItem, con la premisa de que las listas fijas no lo necesitaban
 * porque "en cuanto se carga el primer ítem ya quedan con descuentoManual > 0, y el
 * mecanismo existente (hayDescuentoPorItem) bloquea la cabecera solo". Esa premisa no
 * cubre la ventana entre seleccionar el cliente y cargar el primer ítem: con lista fija
 * (ej. Lista 5.0) y carrito vacío, hayDescuentoPorItem daba false y el campo "Descuento"
 * general quedaba habilitado. Con lista editable (Lista 3.0) el bug no se notaba porque
 * ya estaba cubierto acá desde el vamos.
 */
export function listaPrecioBloqueaDescuentoGeneral(idListaPrecio?: number | null): boolean {
  if (idListaPrecio == null) return false;
  return LISTA_PRECIO_CONFIG[idListaPrecio as IdListaPrecio] != null;
}

/**
 * Tope mínimo/máximo (%) por defecto para el descuento editable de Lista 3.0, usados
 * si todavía no se sembró el valor real en la tabla `parametros` (o falla la lectura).
 * Valores reales parametrizables vía CLAVE_PARAMETRO_DESCUENTO_LISTA_MIN/MAX - "puede
 * cambiar" (decisión del usuario, ago-2026), por eso no son un valor fijo en código.
 */
export const DESCUENTO_LISTA_EDITABLE_MIN_DEFAULT = 10;
export const DESCUENTO_LISTA_EDITABLE_MAX_DEFAULT = 50;

/** Claves en la tabla `parametros` (clave/valor) para el tope de Lista 3.0. */
export const CLAVE_PARAMETRO_DESCUENTO_LISTA_MIN = 'descuentoLista3Min';
export const CLAVE_PARAMETRO_DESCUENTO_LISTA_MAX = 'descuentoLista3Max';

/**
 * true si el cliente es Mayorista con lista de precio propia (≠ Consumidor Final), o
 * tiene Lista 3.0 (LISTA_PRECIO.LISTA_2) sin importar su Categoría.
 *
 * REINTRODUCIDA (ago-2026) con un propósito distinto al que tenía antes. Hasta ahora
 * decidía, en los TOTALES de la venta, si el IVA se sumaba arriba de un precio neto
 * (mayorista) o se discriminaba de un precio que ya lo incluía (resto) - esa distinción
 * se eliminó, los totales discriminan IVA de la misma forma para todos (ver historial de
 * git de esta función).
 *
 * Lo que SÍ sigue haciendo falta distinguir es el precio de catálogo EN SÍ, antes de
 * aplicar cualquier descuento: el catálogo tiene un único precio por producto/servicio,
 * que es el precio final de Consumidor Final (ya con IVA, sin ningún ajuste). Para estos
 * clientes (mayorista con lista propia, o Lista 3.0) hay que sumarle el 21% de IVA a ese
 * precio de catálogo ANTES de aplicar el descuento de lista - "precio lista minorista +
 * IVA", a diferencia de Consumidor Final que usa el precio de catálogo tal cual. Se usa
 * en addmod-ventas.component.ts, en el momento de agregar un producto/servicio/ítem
 * libre al carrito (ver PrecioConIvaSegunLista) - NO en el descuento de lista en sí, que
 * sigue siendo igual para todos vía LISTA_PRECIO_CONFIG.
 */
export function esMayoristaConListaPropia(
  idCategoria?: number | null,
  idListaPrecio?: number | null
): boolean {
  if (idListaPrecio === LISTA_PRECIO.LISTA_2) return true;

  return idCategoria === CATEGORIA_CLIENTE.MAYORISTA &&
         idListaPrecio != null &&
         idListaPrecio !== LISTA_PRECIO.CONSUMIDOR_FINAL;
}

/**
 * Estados posibles de una venta.
 *
 * Todavía se mantienen las variantes
 * masculinas/femeninas para no romper
 * compatibilidad con el sistema actual.
 */
export const ESTADO_VENTA = {
  APROBADO: 'Aprobado',
  APROBADA: 'Aprobada',

  FACTURADO: 'Facturado',
  FACTURADA: 'Facturada',

  ASOCIADO: 'Asociado',
  ASOCIADA: 'Asociada',

  // Estado "en uso" del Presupuesto cuando se usó para armar un Pedido/Nota de
  // Empaque (circuito abierto en otro documento, todavía no hay comprobante ni
  // cobro). Si se factura directo, pasa a FACTURADO/A en vez de quedar acá (ver
  // RELACION_CIERRE en el backend, ventaEstados.ts) - ago-2026. En los dos casos
  // no vuelve a aparecer para elegir (ver ESTADOS_ASOCIADO más abajo).
  RELACIONADO: 'Relacionado',

  PENDIENTE: 'Pendiente',
  FINALIZADA: 'Finalizada',
} as const;

export type EstadoVenta =
  ValueOf<typeof ESTADO_VENTA>;

/**
 * Sets reutilizables para validaciones.
 */
const ESTADOS_FACTURADO = new Set<EstadoVenta>([
  ESTADO_VENTA.FACTURADO,
  ESTADO_VENTA.FACTURADA,
]);

const ESTADOS_ASOCIADO = new Set<EstadoVenta>([
  ESTADO_VENTA.ASOCIADO,
  ESTADO_VENTA.ASOCIADA,
  // RELACIONADO es el equivalente de "ya usado/no disponible" para Presupuesto.
  ESTADO_VENTA.RELACIONADO,
]);

/**
 * Helpers expresivos de estado.
 *
 * Ejemplo:
 * estadoVenta.esFacturado(venta.estado)
 */
export const estadoVenta = {

  esFacturado: (estado: EstadoVenta): boolean =>
    ESTADOS_FACTURADO.has(estado),

  esAsociado: (estado: EstadoVenta): boolean =>
    ESTADOS_ASOCIADO.has(estado),

  esPendiente: (estado: EstadoVenta): boolean =>
    estado === ESTADO_VENTA.PENDIENTE,

} as const;

/**
 * Estados "abiertos" en los que se permite dar de baja un Presupuesto/Pedido/
 * Nota de Empaque (decisión 19/07/2026). Espejo del mismo mapa en el backend
 * (ventaEstados.ts) - se usa acá solo para habilitar/deshabilitar el botón en
 * el front; la validación real (la que importa) la hace el backend.
 */
const ESTADOS_ABIERTOS_BAJA: Partial<Record<IdProceso, EstadoVenta[]>> = {
  [ID_PROCESO.PRESUPUESTO]:  [ESTADO_VENTA.APROBADO],
  [ID_PROCESO.PEDIDO]:       [ESTADO_VENTA.APROBADO],
  [ID_PROCESO.NOTA_EMPAQUE]: [ESTADO_VENTA.PENDIENTE, ESTADO_VENTA.APROBADA],
};

export function puedeDarseDeBaja(idProceso?: number, estado?: string): boolean {
  const estadosAbiertos = ESTADOS_ABIERTOS_BAJA[idProceso as IdProceso];
  if (!estadosAbiertos) return false;
  return estadosAbiertos.includes(estado as EstadoVenta);
}

/**
 * Tipos de método de pago (string, tal como viene del backend).
 * Usado para detectar comportamientos especiales (ej: abrir diálogo cheque).
 */
export const TIPO_METODO_PAGO = {
  CHEQUE:          'CHEQUE',
  CREDITO:         'CREDITO',
  DEBITO:          'DEBITO',
  TRANSFERENCIA:   'TRANSFERENCIA',
  EFECTIVO:        'EFECTIVO',
  DIGITAL:         'DIGITAL',
  CUENTA_CORRIENTE:'CUENTA_CORRIENTE',
  SALDO_FAVOR:     'SALDO_FAVOR',
} as const;

export type TipoMetodoPago = keyof typeof TIPO_METODO_PAGO;

/**
 * Tipos de retención sufrida al cobrar (Ganancias/IIBB/SUSS).
 * Hoy solo se habilita en la UI cuando el método es CHEQUE (ver DatosRetencion en
 * Factura.ts), pero el valor persiste igual sin importar el método, para no tener
 * que tocar este catálogo el día que se habilite para otros métodos.
 */
export const TIPO_RETENCION = {
  GANANCIAS: 'GANANCIAS',
  IIBB:      'IIBB',
  SUSS:      'SUSS',
} as const;

export type TipoRetencion = ValueOf<typeof TIPO_RETENCION>;

export const TIPO_RETENCION_OPCIONES: { value: TipoRetencion; label: string }[] = [
  { value: TIPO_RETENCION.GANANCIAS, label: 'Ganancias' },
  { value: TIPO_RETENCION.IIBB,      label: 'Ing. Brutos' },
  { value: TIPO_RETENCION.SUSS,      label: 'SUSS' },
];
