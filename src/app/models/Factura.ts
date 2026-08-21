import { Cliente } from "./Cliente";
import { FacturaVenta } from "./FacturaVenta";
import { TallesProducto } from "./Producto";

  
  export class Venta{
    id?:number;
    idCaja:number;
    idProceso?:number;
    proceso?:string;
    procAnterior?:number;
    nroProceso?:number;
    idPunto?:number;
    punto?:string;
    fecha?:Date;
    hora?:string;
    // Fecha de entrega prometida al cliente. Opcional, solo se carga/muestra para
    // Presupuesto/Pedido/Nota de Empaque (tipo === 'pre').
    fechaEntrega?:Date;
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
    // Texto libre a nivel de venta (ej. motivo de una Nota de Crédito sin
    // productos: "Adelanto de producción"/"Saldo orden de compra").
    observacion?:string;
    estado?:string;
    impaga:number = 0;
    entregado:number = 0;
    deuda:number = 0;
    ajuste:number = 0;
  }

  export class ProductosFactura{
    idProducto? : number;
    // Origen de idProducto: 'CATALOGO' -> productos, 'PRESUPUESTO' -> productos_presupuesto.
    // Ver TIPO_ITEM / esItemNoCatalogado en venta.constants.ts. A diferencia del resto de
    // los flags de esta clase, este SÍ se persiste (columna ventas_productos.tipoItem).
    tipoItem?: string;
    // Snapshot del nombre al facturar, solo para ítems no catalogados.
    descripcion?: string;
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
    // Descuento (%) tipeado a mano en la columna "Desc. %" de la grilla, ítem por ítem.
    // Mutuamente excluyente con el descuento general de cabecera (ver hayDescuentoPorItem/
    // DescuentoBaseDe en addmod-ventas.component.ts) - ago-2026. Solo vive en memoria
    // mientras se arma la venta: no se persiste tal cual, el importeDescuento($) resultante
    // sí se persiste y es lo que se usa para reconstruir este valor al reabrir la venta.
    descuentoManual?: number;
    tallesSeleccionados:string = "";
    stockInicial: any = {};
    // Tope de cantidad para la Nota de Crédito sobre un ítem no catalogado (sin
    // talles, ver tipoItem). Espejo de ServiciosFactura.cantidadOriginal - ver
    // PrepararPrecios en listado-ventas.component.ts.
    cantidadOriginal?: number;
    // true si el precio fue acordado/editado a mano (ver ActualizarValoresPresupuesto en
    // addmod-ventas). Evita que los recálculos automáticos de precio por cambio de cliente/
    // comprobante pisen el valor pactado. precio (lista) no se toca y viaja como precioLista.
    precioEditadoManualmente?: boolean;
  
    constructor(data?: any) {
      if (data) {
        this.idProducto = data.idProducto;
        this.tipoItem = data.tipoItem;
        this.descripcion = data.descripcion;
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
        this.descuentoManual = data.descuentoManual;
        this.tallesSeleccionados = data.tallesSeleccionados;
      }
    }
  }

  export class ServiciosFactura{
    idServicio? : number;
    codServicio?: string;
    nomServicio?: string;
    cantidad?: number;
    // Precio de catálogo ancla, sin ajustes (ago-2026) - espejo de
    // ProductosFactura.precio: unitario es lo que se muestra/usa según comprobante+lista
    // (ver PrecioItemSegunComprobante en addmod-ventas.component.ts), precio es el valor
    // de referencia sin ese ajuste, para poder recalcular unitario si cambia el
    // comprobante o el cliente (ver RecalcularPreciosSegunComprobante).
    precio?: number;
    unitario?: number;
    precioMostrar?: number;
    total?: number;
    totalMostrar?: number;
    topeDescuento?:number;
    descuentoAplicado?:number;
    importeDescuento?:number;
    // Ver comentario equivalente en ProductosFactura.descuentoManual.
    descuentoManual?: number;
    cantidadOriginal?: number;

    constructor(data?: any) {
      if (data) {
        this.idServicio = data.idServicio;
        this.codServicio = data.codServicio;
        this.cantidad = data.cantidad;
        this.precio = data.precio;
        this.unitario = data.unitario;
        this.precioMostrar = data.precioMostrar;
        this.nomServicio = data.nomServicio;
        this.total = data.total;
        this.totalMostrar = data.totalMostrar;
        this.topeDescuento = data.topeDescuento;
        this.descuentoAplicado = data.descuentoAplicado;
        this.importeDescuento = data.importeDescuento;
        this.descuentoManual = data.descuentoManual;
        this.cantidadOriginal = data.cantidadOriginal;
      }
    }
  }

  export class PagosFactura{
    id:number = 0;
    idMetodo? : number;
    metodo?: string;
    tipo?: string;
    monto?: number;
    cheque?: any;   // datos del cheque cuando tipo === 'CHEQUE'
    // Retención sufrida (Ganancias/IIBB/SUSS). Vive desacoplada de `cheque` a
    // propósito: es un atributo del pago, no del instrumento - hoy solo se carga
    // cuando tipo === 'CHEQUE', pero el modelo no lo asume.
    retencion?: { tipo: string; importe: number };

    constructor(data?: any) {
      if (data) {
        this.idMetodo = data.idMetodo;
        this.metodo = data.metodo;
        this.tipo = data.tipo;
        this.monto = data.monto;
        this.cheque = data.cheque;
        this.retencion = data.retencion;
      }
    }
  }

  export class NotaCreditoVenta{
    idNotaVenta:number = 0;
    nroProceso:number = 0;
    total:number = 0;
    // 3/8/13 = fiscal (NC A/B/C), 100 = interna/X. Ver TipoComprobante en
    // ObjFacturar.ts y tieneNotaFiscal/tieneNotaInterna en venta.constants.ts.
    idTipoComprobante:number = 0;
  }
  
  export class VentasClienteCuenta{
  id: number = 0;
  nroProceso: number = 0;
  proceso: string = "";
  fecha: Date = new Date();
  comprobante: string = "";
  tipo: string = "";
  debe: number = 0;
  haber: number = 0;
  saldo: number = 0;
  estado: string = "";
  referencia: string = "";
  observaciones: string = "";
}
  