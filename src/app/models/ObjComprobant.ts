export class ObjComprobante {
    nroRemito: number;
    nroProceso?:number;
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
    // Índices (dentro de filasProducto) de las filas de subheader por línea de talle,
    // para que el layout de la tabla (ArmarInternoA4) las pueda estilar distinto del zebra normal.
    filasProductoGrupos?:number[];
    // Índices (dentro de filasProducto) de filas que son "continuación" del mismo producto
    // (mismo idProducto+idColor que la fila anterior), partido en 2+ líneas por tener precio
    // distinto entre talles -ver addmod-ventas.component.ts AgregarProducto-. Se usa para
    // no repetir Código/Nombre/Color y no dibujar la línea divisoria entre ambas filas.
    filasProductoContinuacion?:number[];
    cantProductos?:number;
    cantServicios?:number;
    subTotal?:number;
    totalIva?:number;
    totalFinal?:number;
    totalAPagar?:number;
    // true cuando la venta no tiene productos ni servicios (ej. NC X "sin productos"
    // cargada por un total libre - ver nota-credito-x.component.ts). Se usa para
    // mostrar un label en vez de la tabla/contador vacíos en el comprobante impreso.
    sinItems?:boolean;

    constructor(data?: any) {
        if (data) {
          this.nroRemito = data.nroRemito;
          this.nroProceso = data.nroProceso;
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