export class CompraCuentaProveedor{
  id: number = 0;
  fecha: Date = new Date();
  idTipoComprobante: number = 0;
  tipoComprobante: string = "";
  nroComprobante: string = "";
  total: number = 0;
  impaga: number = 0;
  baja: Date;
  pagado: number = 0;
  pendiente: number = 0;
}
