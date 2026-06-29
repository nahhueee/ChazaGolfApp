type ValueOf<T> = T[keyof T];

/**
 * IDs de tipos de comprobante (tabla `tipos_comprobantes`, compartida con Ventas).
 * Se duplica acá el subset relevante para Compras en vez de importar venta.constants.ts:
 * son dominios distintos (condición IVA del cliente vs. condición fiscal propia) y no
 * conviene acoplarlos, aunque hoy los IDs numéricos coincidan con los de Ventas.
 */
export const TIPO_COMPROBANTE_COMPRA = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  COTIZACION: 99,
} as const;

export type TipoComprobanteCompra = ValueOf<typeof TIPO_COMPROBANTE_COMPRA>;

export const COMPROBANTES_COMPRA: { id: TipoComprobanteCompra; descripcion: string }[] = [
  { id: TIPO_COMPROBANTE_COMPRA.FACTURA_A, descripcion: 'Factura A' },
  { id: TIPO_COMPROBANTE_COMPRA.FACTURA_B, descripcion: 'Factura B' },
  { id: TIPO_COMPROBANTE_COMPRA.FACTURA_C, descripcion: 'Factura C' },
  { id: TIPO_COMPROBANTE_COMPRA.COTIZACION, descripcion: 'Cotización' },
];

/**
 * Condición fiscal de la empresa emisora (propia). Mismo valor que CONDICION_EMPRESA
 * de venta.constants.ts hoy, duplicado deliberadamente por la misma razón de arriba.
 */
export const CONDICION_EMPRESA = {
  RESPONSABLE_INSCRIPTO: 'RI',
  MONOTRIBUTO: 'MONO',
} as const;

export type CondicionEmpresa = ValueOf<typeof CONDICION_EMPRESA>;

/**
 * Comprobantes habilitados para registrar una compra, según la condición fiscal de la
 * empresa propia. Regla validada con el cliente (17-jun-2026): en Fase 1 NO depende de
 * la condición IVA del proveedor, solo de `Empresa.abrevCondicion`.
 */
export const COMPROBANTES_POR_CONDICION_EMPRESA: Record<CondicionEmpresa, TipoComprobanteCompra[]> = {
  [CONDICION_EMPRESA.RESPONSABLE_INSCRIPTO]: [
    TIPO_COMPROBANTE_COMPRA.FACTURA_A,
    TIPO_COMPROBANTE_COMPRA.FACTURA_B,
    TIPO_COMPROBANTE_COMPRA.FACTURA_C,
    TIPO_COMPROBANTE_COMPRA.COTIZACION,
  ],
  [CONDICION_EMPRESA.MONOTRIBUTO]: [
    TIPO_COMPROBANTE_COMPRA.FACTURA_C,
    TIPO_COMPROBANTE_COMPRA.COTIZACION,
  ],
};

/**
 * IDs reales de `alicuotas_iva` (seed fijo de la migración 20260617141038_create_compras.js).
 * Solo las 3 activas en F1; las inactivas (5%, 2,5%, Exento) no se exponen en el formulario.
 */
export const ALICUOTA_IVA = {
  VEINTIUNO: 1,
  DIEZ_CINCO: 2,
  VEINTISIETE: 3,
} as const;

export type AlicuotaIva = ValueOf<typeof ALICUOTA_IVA>;

export const ALICUOTAS_IVA_COMPRA: { id: AlicuotaIva; descripcion: string }[] = [
  { id: ALICUOTA_IVA.VEINTIUNO, descripcion: '21%' },
  { id: ALICUOTA_IVA.DIEZ_CINCO, descripcion: '10,5%' },
  { id: ALICUOTA_IVA.VEINTISIETE, descripcion: '27%' },
];

/**
 * Provincias argentinas para percepciones de IIBB. No existe catálogo en DB
 * (`compras_percepciones_iibb.provincia` es string libre) -> lista fija de 24.
 */
export const PROVINCIAS_IIBB: string[] = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

/**
 * Estados posibles de una compra. Solo hay alta y baja lógica (sin Modificar).
 */
export const ESTADO_COMPRA = {
  APROBADA: 'Aprobada',
} as const;

export type EstadoCompra = ValueOf<typeof ESTADO_COMPRA>;

/**
 * Tipos de método de pago (string, tal como viene del backend - columna `metodos_pago.tipo`).
 * Duplicado deliberadamente de TIPO_METODO_PAGO (venta.constants.ts) por la misma razón que el
 * resto del archivo: dominios distintos, no conviene acoplar Compras a Ventas. Incluye además
 * los dos tipos exclusivos de Compras (CUENTA_CORRIENTE_PROVEEDOR, SALDO_FAVOR_PROVEEDOR), que
 * ya se usan como literales en comprasRepository.ts / comprasCuentasRepository.ts del backend
 * pero no tenían un enum equivalente en el frontend.
 */
export const TIPO_METODO_PAGO_COMPRA = {
  CHEQUE: 'CHEQUE',
  CREDITO: 'CREDITO',
  DEBITO: 'DEBITO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  EFECTIVO: 'EFECTIVO',
  DIGITAL: 'DIGITAL',
  CUENTA_CORRIENTE_PROVEEDOR: 'CUENTA_CORRIENTE_PROVEEDOR',
  SALDO_FAVOR_PROVEEDOR: 'SALDO_FAVOR_PROVEEDOR',
} as const;

export type TipoMetodoPagoCompra = keyof typeof TIPO_METODO_PAGO_COMPRA;
