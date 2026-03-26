import { TallesProducto } from "./Producto";

export class ProductoOrden{
    id: number = 0;
    idProducto? : number;
    codProducto?: string;
    nomProducto?: string;
    topeDescuento?: number;
    talles?: TallesProducto[];
    idColor?: number;
    color?: string;
    hexa?: string;
    cantidad?: number;
    idLineaTalle?:number;
    estado: "Pendiente" | "Ingresado" | "Eliminado" = "Pendiente";
    t1?: number;
    t2?: number;
    t3?: number;
    t4?: number;
    t5?: number;
    t6?: number;
    t7?: number;
    t8?: number;
    t9?: number;
    t10?: number;
    tallesSeleccionados:string = "";
    codigosBarra:[] = [];
 
    constructor(data?: any) {
      if (data) {
        this.id = data.id;
        this.idProducto = data.idProducto;
        this.codProducto = data.codProducto;
        this.talles = data.talles;
        this.cantidad = data.cantidad;
        this.topeDescuento = data.topeDescuento;
        this.idColor = data.idColor;
        this.color = data.color;
        this.hexa = data.hexa;
        this.idLineaTalle = data.idLineaTalle;
        this.estado = data.estado;
        this.t1 = data.t1;
        this.t2 = data.t2;
        this.t3 = data.t3;
        this.t4 = data.t4;
        this.t5 = data.t5;
        this.t6 = data.t6;
        this.t7 = data.t7;
        this.t8 = data.t8;
        this.t9 = data.t9;
        this.t10 = data.t10;
        this.nomProducto = data.nomProducto;
        this.tallesSeleccionados = data.tallesSeleccionados;
      }
    }
  }