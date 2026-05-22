/**
 * Estado derivado de los cálculos financieros de una venta.
 * Todos los campos son readonly: este objeto nunca se muta,
 * siempre se reemplaza completo via recalcularTotales().
 */
export interface TotalesVenta {
  readonly items:               number;  // suma bruta de productos + servicios
  readonly descuento:           number;  // descuento total aplicado
  readonly subtotal:            number;  // base imponible (sin IVA)
  readonly iva:                 number;  // IVA calculado
  readonly general:             number;  // total con IVA
  readonly ajusteTransferencia: number;  // 10% si aplica ajuste
  readonly aPagar:              number;  // general + ajuste + redondeo
  readonly cantItems:           number;  // cantidad de unidades (no líneas)
  readonly mostrarIva:          boolean; // controla visibilidad en template
}