export class ObjComprobante {
    nroRemito: number;
    nroProceso?:number;
    papel?:string;
    nombreLocal?:string;
    proceso?:string;
    cliente?:string;
    fechaVenta?:string;
    horaVenta?:string;
    // Fecha de entrega prometida y observaciones (Presupuesto/Pedido/Nota de
    // Empaque). Undefined/vacío cuando la venta no las tiene cargadas - el
    // remito las omite en ese caso (ver ArmarInternoA4).
    fechaEntrega?:string;
    observacion?:string;
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
    // Bruto real (suma de ítems, sin descontar) - ver GenerarDatosComunes en factura.service.ts.
    subTotal?:number;
    // Base imponible (neto de descuento, sin IVA) - solo se imprime cuando hay IVA a mostrar
    // (ver "Detalle de Totales" en ArmarFacturaA4). Antes solo vivía en datosFactura.neto,
    // duplicado en el pie "Neto Total" del comprobante (bloque que ahora se sacó, ago-2026,
    // por redundante con este resumen).
    neto?:number;
    totalIva?:number;
    // Siempre false (ago-2026): el precio de catálogo ya incluye IVA para cualquier
    // cliente/lista, sin excepciones, y se discrimina de él sin cambiar el total. Antes
    // distinguía mayorista con lista propia (precio neto, IVA sumado aparte) del resto -
    // ver esMayoristaConListaPropia en el historial de git de venta.constants.ts. Usado
    // solo para el label "IVA 21% (Incluido)" - se mantiene el campo por si se necesita
    // reintroducir la distinción más adelante.
    ivaDiscriminado?:boolean;
    // true si el comprobante es una Factura (A/B/C) y el cliente es mayorista con lista
    // propia o Lista 3.0 (ver esMayoristaConListaPropia) - oculta la columna "Desc" en
    // filasProducto/filasServicio (ago-2026, a pedido del cliente: en factura no quiere
    // mostrarle al mayorista el % de descuento aplicado, solo Cantidad/Precio/Total).
    // Determina también el ancho de columnas de esas tablas - ver ArmarFacturaA4.
    ocultarDescuento?:boolean;
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
          this.fechaEntrega = data.fechaEntrega;
          this.observacion = data.observacion;
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