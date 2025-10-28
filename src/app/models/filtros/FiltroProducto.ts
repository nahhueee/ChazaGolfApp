export class FiltroProducto{
  pagina = 1;
  tamanioPagina = 15;
  total = 0;
  desdeFacturacion:boolean = false;
  busqueda = "";
  orden = "";
  direccion = "";
  faltantes:boolean;
  proceso:number = 0;
  tipo:number = 0;
  subtipo:number = 0;
  genero:number = 0;
  material:number = 0;
  color:number = 0;
  temporada:number = 0;

  constructor(data?: any) {
    if (data) {
      this.pagina = data.pagina;
      this.tamanioPagina = data.tamanioPagina;
      this.total = data.total;
      this.desdeFacturacion = data.desdeFacturacion;
      this.busqueda = data.busqueda;
      this.orden = data.orden;
      this.direccion = data.direccion;
      this.faltantes = data.faltantes;
      this.proceso = data.proceso;
      this.tipo = data.tipo;
      this.subtipo = data.subtipo;
      this.genero = data.genero;
      this.material = data.material;
      this.color = data.color;
      this.temporada = data.temporada;
    }
  }
}

