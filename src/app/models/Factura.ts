

  export class ProductosFactura{
    idProducto? : number;
    codProducto?: string;
    nomProducto?: string;
    cantidad?: number;
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
    costo?: number;
    unitario?: number;
    total?: number;
    tallesSeleccionados:string = "";
  
    constructor(data?: any) {
      if (data) {
        this.idProducto = data.idProducto;
        this.codProducto = data.codProducto;
        this.cantidad = data.cantidad;
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
        this.costo = data.costo;
        this.unitario = data.unitario;
        this.nomProducto = data.nomProducto;
        this.total = data.total;
        this.tallesSeleccionados = data.tallesSeleccionados;
      }
    }
  }

  export class ServiciosFactura{
    idServicio? : number;
    codServicio?: string;
    nomServicio?: string;
    cantidad?: number;
    unitario?: number;
    total?: number;
  
    constructor(data?: any) {
      if (data) {
        this.idServicio = data.idServicio;
        this.codServicio = data.codServicio;
        this.cantidad = data.cantidad;
        this.unitario = data.unitario;
        this.nomServicio = data.nomServicio;
        this.total = data.total;
      }
    }
  }
  
  