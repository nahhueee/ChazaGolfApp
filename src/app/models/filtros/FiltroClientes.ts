export class FiltroClientes{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  nombre: string = "";
  condicionIva: string = "";
  condicionPago: string = "";
  documento: number = 0;
  orden = "";
  direccion = "";

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.orden = data.orden;
      this.direccion = data.direccion;
      this.nombre = data.nombre;
      this.condicionIva = data.condicionIva;
      this.condicionPago = data.condicionPago;
      this.documento = data.documento;
    }
  }
}

export class FiltroVentasCliente{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  proceso:String = '';
  estado:string = "";
  cliente:number = 0;
  fechas = "";

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.proceso = data.proceso;
      this.estado = data.estado;
      this.cliente = data.cliente;
      this.fechas = data.fechas;
    }
  }
}