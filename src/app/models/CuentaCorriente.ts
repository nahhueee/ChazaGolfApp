export class CuentaCorriente{
  idCliente: number = 0;
  cliente: string = "";
  debe: number = 0;
  haber: Date;
  saldo: number;
  estado: string;
  ultimoMovimiento: Date;
}

