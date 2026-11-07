// Fila del ledger unificado de la cuenta corriente de un proveedor (saldo inicial + compras + pagos).
// Espejo de VentasClienteCuenta (CuentaCorriente.ts) sin nroProceso/tipo: no aplican al circuito de
// Proveedores. Ver comprasCuentasRepository.ObtenerQueryMovimientosProveedor (backend).
export class MovimientoProveedor{
  id: number = 0;
  proceso: string = ""; // 'INICIAL' | 'COMPRA' | 'PAGO'
  fecha: Date = new Date();
  comprobante: string = "";
  debe: number = 0;
  haber: number = 0;
  saldo: number = 0; // acumulado calculado por el backend (window function)
  movimiento: number = 0; // lo que realmente mueve el saldo (con signo); 0 en anuladas y compras al contado
  pagado: number = 0; // solo COMPRA: lo ya pagado con pagos vigentes (si es > 0 no se puede dar de baja)
  estado: string = "";
  referencia: string = "";
  observaciones: string = "";
}
