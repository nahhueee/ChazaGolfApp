export class Cliente {
    id:number = 0;
    nombre?:string;
    razonSocial?:string;
    telefono?:string;
    celular?:string;
    contacto?:string;
    email?:string;
    idCondicionIva?:number;
    condicionIva?:string;
    idTipoDocumento?:number;
    tipoDocumento?:string;
    documento?:number;
    idListaPrecio?:number;
    listaPrecio:string;
    idCondicionPago?:number;
    condicionPago?:string;
    idCategoria?:number;
    inicial?:number;
    fechaAlta?:Date;
    // Plazo de pago habitual, en días. 0 = no configurado. Se usa en el backend
    // para calcular ventas.fechaVencimiento al emitir Factura/Cotización.
    diasVencimiento?:number;
    direcciones?:DireccionesCliente[];
    ultimoDescuento?:UltimoDescuentoCliente;
    saldo?:number;
}

export class DireccionesCliente {
    id?:number;
    idCliente?:number;
    resumen?:string = "";
    codPostal?:string = "";
    calle?:string = "";
    numero?:string = "";
    localidad?:string = "";
    provincia?:string = "";
    observaciones?:string = "";
}


export class UltimoDescuentoCliente {
    descuento?:number;
    idTipoDescuento?:number;
    tipoDescuento?:string;
}
