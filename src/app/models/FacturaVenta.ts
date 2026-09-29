import { TipoComprobante } from "./ObjFacturar";

export class FacturaVenta{
    estado?: string;
    // F3 - HANDOFF blindaje facturacion y logs. Id de fe_emisiones devuelto por
    // /ventas/facturar: viaja con la venta a /agregar o /modificar para que el backend
    // vincule fe_emisiones.idVenta (ver ventasRepository.ts, InsertFacturaVenta).
    idEmision?: number;
    cae?: string;
    caeVto?: Date;
    ticket? : number;
    tipoComprobante? : number;
    desComprobante?: string;
    neto? : number;
    iva? : number;
    dni? : number;
    tipoDni? : number;
    ptoVenta?: number;
    condReceptor? : number;

    comprobanteAsociado?: {
        tipo: TipoComprobante;
        puntoVenta: number;
        numero: number;
    };

    constructor(data?: any) {
      if (data) {
        this.estado = data.estado;
        this.idEmision = data.idEmision;
        this.cae = data.cae;
        this.caeVto = data.caeVto;
        this.ticket = data.ticket;
        this.tipoComprobante = data.tipoComprobante;
        this.desComprobante = data.desComprobante;
        this.neto = data.neto;
        this.iva = data.iva;
        this.dni = data.dni;
        this.tipoDni = data.tipoDni;
        this.ptoVenta = data.ptoVenta;
        this.condReceptor = data.condReceptor;
        this.comprobanteAsociado = data.comprobanteAsociado;
      }
    }
}
  
  