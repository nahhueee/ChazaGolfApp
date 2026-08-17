import { MULTIPLICADOR_LISTA_PRECIO } from '../models/venta.constants';

/**
 * Calcula el precio final de un producto según la lista de precio del cliente.
 *
 * @param precioBase - Precio sin descuento (precio de lista 1, consumidor final).
 * @param idListaPrecio - ID de la lista de precio del cliente.
 * @returns Precio ajustado. Si la lista no existe, devuelve el precio base sin modificar.
 *
 * Función pura: no tiene side effects, no accede a estado externo.
 * Testeable unitariamente sin levantar el componente.
 *
 * OJO (ago-2026): en addmod-ventas.component.ts (Presupuesto/Pedido/Factura) esto ya NO
 * se usa - el descuento de lista pasó a precargarse en `descuentoManual` (visible, ver
 * LISTA_PRECIO_CONFIG en venta.constants.ts) en vez de hornearse acá en el precio. Este
 * helper sigue vigente únicamente para nota-credito-x.component.ts, que todavía no tiene
 * columna "Desc. %" por ítem.
 */
export function calcularPrecioCliente(precioBase: number, idListaPrecio: number): number {
  const multiplicador = MULTIPLICADOR_LISTA_PRECIO[idListaPrecio] ?? 1;
  return precioBase * multiplicador;
}