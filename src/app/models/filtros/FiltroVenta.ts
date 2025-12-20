export class FiltroVenta{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  busqueda = "";
  orden = "";
  direccion = "";
  tipo = "";
  idProceso = 0;
  nroProceso = 0;
  fechas = "";
  cliente = 0;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.busqueda = data.busqueda;
      this.orden = data.orden;
      this.direccion = data.direccion;
      this.tipo = data.tipo;
      this.idProceso = data.idProceso;
      this.nroProceso = data.nroProceso;
      this.fechas = data.fechas;
      this.cliente = data.cliente;
    }
  }
}

