import { ProductoOrden } from "./ProductoOrden";

export class OrdenIngreso{
  id? : number;
  idProveedor? : number;
  fecha? : Date;
  observaciones: string = "";
  corte: number = 0;
  usuario: string = "";
  productos: ProductoOrden[] = [];
  estado: string = "";
  actualizacion: Date = new Date();
  recepcionesRevertir:number[]=[];
  
  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.idProveedor = data.idProveedor;
      this.fecha = data.fecha;
      this.observaciones = data.observaciones;
      this.corte = data.corte;
      this.usuario = data.usuario;
      this.productos = data.productos;
      this.estado = data.estado;
    }
  }
}

