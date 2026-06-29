export class CuentaCorrienteProveedor{
  idProveedor: number = 0;
  proveedor: string = "";
  saldoInicial: number = 0;
  deuda: number = 0;
  saldoAFavor: number = 0;
  saldo: number = 0;
  estado: string = "";
  ultimoMovimiento: Date;
}
