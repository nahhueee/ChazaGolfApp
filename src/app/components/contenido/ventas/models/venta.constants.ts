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

  [CONDICION_IVA.IVA_NO_ALCANZADO]:
    TIPO_COMPROBANTE.FACTURA_B,

  [CONDICION_IVA.SIN_CLIENTE]:
    TIPO_COMPROBANTE.FACTURA_B,
} as const;

/**
 * IDs de listas de precio.
 */
export const LISTA_PRECIO = {
  CONSUMIDOR_FINAL: 1,
  LISTA_2: 2,
  LISTA_3: 3,
  LISTA_4: 4,
  LISTA_5: 5,
  LISTA_6: 6,
} as const;

export type IdListaPrecio = ValueOf<typeof LISTA_PRECIO>;

/**
 * Multiplicadores de precio
 * según lista asignada.
 *
 * Ejemplo:
 * 0.70 = 30% descuento
 */
export const MULTIPLICADOR_LISTA_PRECIO: Record<IdListaPrecio, number> = {
  [LISTA_PRECIO.CONSUMIDOR_FINAL]: 1.00,
  [LISTA_PRECIO.LISTA_2]: 0.70,
  [LISTA_PRECIO.LISTA_3]: 0.65,
  [LISTA_PRECIO.LISTA_4]: 0.60,
  [LISTA_PRECIO.LISTA_5]: 0.55,
  [LISTA_PRECIO.LISTA_6]: 0.50,
} as const;

/**
 * Cliente mayorista con lista de precio propia (≠ Consumidor Final).
 * Para estos clientes, el precio resultante de calcularPrecioCliente() es siempre
 * NETO (sin IVA), a diferencia de Consumidor Final donde el precio de góndola ya
 * incluye IVA. Se usa para decidir, tanto en Factura A como en B, si el IVA se suma
 * arriba del precio (mayorista) o se discrimina de un precio que ya lo incluye (resto).
 *
 * Centralizada acá porque la misma condición se necesita en addmod-ventas,
 * listado-ventas, notas-venta y vista-previa.
 */
export function esMayoristaConListaPropia(
  idCategoria?: number | null,
  idListaPrecio?: number | null
): boolean {
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

  // Estado de cierre exclusivo del Presupuesto: a diferencia de Pedido/Nota
  // de Empaque, el Presupuesto no tiene un "Facturado" propio (no es un
  // documento que se facture). Una vez usado para armar un Pedido/Nota, o
  // facturado directo, queda en RELACIONADO y no vuelve a aparecer para elegir.
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
