export class FiltroOrdenes{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  nroOrden: number = 0;
  nroCorte: number = 0;
  estado: string = "";
  orden = "";
  direccion = "";

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.nroOrden = data.nroOrden;
      this.nroCorte = data.nroCorte;
      this.estado = data.estado;
      this.orden = data.orden;
      this.direccion = data.direccion;
    }
  }
}