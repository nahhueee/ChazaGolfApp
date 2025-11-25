export class FiltroVenta{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  busqueda = "";
  orden = "";
  direccion = "";
  tipo = ""

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.busqueda = data.busqueda;
      this.orden = data.orden;
      this.direccion = data.direccion;
      this.tipo = data.tipo;
    }
  }
}

