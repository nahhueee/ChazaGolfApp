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
 */
export function calcularPrecioCliente(precioBase: number, idListaPrecio: number): number {
  const multiplicador = MULTIPLICADOR_LISTA_PRECIO[idListaPrecio] ?? 1;
  return precioBase * multiplicador;
}