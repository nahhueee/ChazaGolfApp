export class FiltroStock {
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  idProducto = 0;
  usuario = "";
  fechas: any = "";

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.idProducto = data.idProducto;
      this.usuario = data.usuario;
      this.fechas = data.fechas;
    }
  }
}
