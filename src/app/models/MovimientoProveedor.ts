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
  saldo: number = 0;
  estado: string = "";
  referencia: string = "";
  observaciones: string = "";
}
