export class FiltroCompras{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  idProveedor = 0;
  idTipoComprobante = 0;
  estado = "";
  fechas = "";
  incluirBaja = false;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.idProveedor = data.idProveedor;
      this.idTipoComprobante = data.idTipoComprobante;
      this.estado = data.estado;
      this.fechas = data.fechas;
      this.incluirBaja = data.incluirBaja ?? false;
    }
  }
}
