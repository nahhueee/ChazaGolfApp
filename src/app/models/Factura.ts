import { Cliente } from "./Cliente";
import { FacturaVenta } from "./FacturaVenta";
import { TallesProducto } from "./Producto";

  
  export class Venta{
    id?:number;
    idProceso?:number;
    proceso?:string;
    procAnterior?:number;
    nroProceso?:number;
    idPunto?:number;
    punto?:string;
    fecha?:Date;
    hora?:string;
    cliente?:Cliente;
    // idCliente?:number;
    // cliente?:string;
    // condCliente:string;
    // clienteRazonSocial:string;
    idListaPrecio?:number;
    listaPrecio?:string;
    idEmpresa?:number;
    empresa?:string;
    idTipoComprobante?:number;
    tipoComprobante?:string;
    idTipoDescuento?:number;
    tipoDescuento?:string;
    descuento:number = 0;
    codPromocion?:number;
    redondeo:number = 0;
    total?:number;
    productos:ProductosFactura[];
    servicios:ServiciosFactura[];
    pagos:PagosFactura[];
    factura?:FacturaVenta;
    notas?:NotaCreditoVenta[];

    nroRelacionado?:number;
    tipoRelacionado?:string;
    estado?:string;
    impaga:number = 0;
    entregado:number = 0;
    deuda:number = 0;
  }

  export class ProductosFactura{
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
    precio?: number;
    unitario?: number;
    precioMostrar?: number;
    total?: number;
    totalMostrar?: number;
    descuentoAplicado?:number;
    importeDescuento?:number;
    tallesSeleccionados:string = "";
    stockInicial: any = {};
  
    constructor(data?: any) {
      if (data) {
        this.idProducto = data.idProducto;
        this.codProducto = data.codProducto;
        this.talles = data.talles;
        this.cantidad = data.cantidad;
        this.topeDescuento = data.topeDescuento;
        this.idColor = data.idColor;
        this.color = data.color;
        this.hexa = data.hexa;
        this.idLineaTalle = data.idLineaTalle;
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
        this.precio = data.precio;
        this.precioMostrar = data.precioMostrar;
        this.totalMostrar = data.totalMostrar;
        this.unitario = data.unitario;
        this.nomProducto = data.nomProducto;
        this.total = data.total;
        this.descuentoAplicado = data.descuentoAplicado;
        this.importeDescuento = data.importeDescuento;
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
    topeDescuento?:number;
    descuentoAplicado?:number;
  
    constructor(data?: any) {
      if (data) {
        this.idServicio = data.idServicio;
        this.codServicio = data.codServicio;
        this.cantidad = data.cantidad;
        this.unitario = data.unitario;
        this.nomServicio = data.nomServicio;
        this.total = data.total;
        this.topeDescuento = data.topeDescuento;
        this.descuentoAplicado = data.descuentoAplicado;
      }
    }
  }

  export class PagosFactura{
    id:number = 0;
    idMetodo? : number;
    metodo?: string;
    monto?: number;
  
    constructor(data?: any) {
      if (data) {
        this.idMetodo = data.idMetodo;
        this.metodo = data.metodo;
        this.monto = data
      }
    }
  }

  export class NotaCreditoVenta{
    idNotaVenta:number = 0;
    nroProceso:number = 0;
    total:number = 0;
  }
  
  
  