import { ProductoOrdenBaja } from "./ProductoOrden";

export class Recepcion{
  id? : number;
  idOrden? : number;
  fecha? : Date;
  usuario: string = "";
  detalles: DetalleRecepcion[] = [];
  bajas: ProductoOrdenBaja[] = [];
  
  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.idOrden = data.idOrden;
      this.fecha = data.fecha;
      this.usuario = data.usuario;
    }
  }
}

export class DetalleRecepcion{
  id? : number;
  idRecepcion? : number;
  idProducto? : number;
  idLineaTalle? : number;
  cantidad? : number;
  original? : number;
  talle? : string;
  fechaBaja? : Date;
  obsBaja? : string;
  
  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.idRecepcion = data.idRecepcion;
      this.idProducto = data.idProducto;
      this.idLineaTalle = data.idLineaTalle;
      this.cantidad = data.cantidad;
      this.original = data.original;
      this.talle = data.talle;
      this.fechaBaja = data.fechaBaja;
      this.obsBaja = data.obsBaja;
    }
  }
}

export class RecepcionHistorial{
  idProducto? : number;
  idRecepcion? : number;
  idLineaTalle? : number;
  fecha? : Date;
  usuario? : string;
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
  "3XL": number;
  "4XL": number;
  "5XL": number;
  "6XL": number;
  total: number;
  cantidad? : string;
  paraRevertir: boolean;
}

