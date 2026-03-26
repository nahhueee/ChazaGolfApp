export class FiltroClientes{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  nombre: string = "";
  condicionIva: string = "";
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
      this.documento = data.documento;
    }
  }
}