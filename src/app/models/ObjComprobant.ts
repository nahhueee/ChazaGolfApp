export class ObjComprobante {
    papel?:string;
    nombreLocal?:string;
    proceso?:string;
    cliente?:string;
    fechaVenta?:string;
    horaVenta?:string;
    descuento?:number;
    redondeo?:number;
    filasProducto?:any[];
    filasServicio?:any[];
    cantProductos?:number;
    cantServicios?:number;
    subTotal?:number;
    totalIva?:number;
    totalFinal?:number;
    totalAPagar?:number;
  
    constructor(data?: any) {
        if (data) {
          this.papel = data.papel;
          this.nombreLocal = data.nombreLocal;
          this.fechaVenta = data.fechaVenta;
          this.horaVenta = data.horaVenta;
          this.descuento = data.descuento;
          this.redondeo = data.redondeo;
          this.filasProducto = data.filasProducto;
          this.filasServicio = data.filasServicio;
          this.cantProductos = data.cantProductos;
          this.cantServicios = data.cantServicios;
          this.subTotal = data.subtotal;
          this.totalIva = data.totalIva;
          this.totalFinal = data.totalFinal;
          this.totalAPagar = data.totalAPagar;
        
        }
    }
}