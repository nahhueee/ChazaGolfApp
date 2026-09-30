import { TipoComprobante } from "./ObjFacturar";

export class FacturaVenta{
    estado?: string;
    // F3 - HANDOFF blindaje facturacion y logs. Id de fe_emisiones devuelto por
    // /ventas/facturar: viaja con la venta a /agregar o /modificar para que el backend
    // vincule fe_emisiones.idVenta (ver ventasRepository.ts, InsertFacturaVenta).
    idEmision?: number;
    // F4.2 - HANDOFF blindaje facturacion y logs. Id de la venta ya persistida por
    // /ventas/emitir (alta o modificacion resuelta del lado del backend, en la misma
    // transaccion que el CAE). El padre lo usa para setear this.venta.id sin volver a
    // llamar a Agregar()/Modificar() (ver addmod-ventas/notas-venta Guardar()).
    idVenta?: number;
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

    // F4.2 fix - HANDOFF blindaje facturacion y logs (sep-2026). true cuando el error
    // de /ventas/emitir es COMPROBANTE_INCIERTO o COMPROBANTE_SIN_REGISTRAR: ya puede
    // existir un CAE real emitido en ARCA, así que no hay que permitir reintentar
    // facturar esta venta (ver GuardarFacturar en addmod-ventas.component.ts). undefined/
    // false para el resto de los errores (rechazo, timeout, stock, etc.), que sí se
    // pueden reintentar.
    bloqueaReintento?: boolean;

    constructor(data?: any) {
      if (data) {
        this.estado = data.estado;
        this.idEmision = data.idEmision;
        this.idVenta = data.idVenta;
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
        this.bloqueaReintento = data.bloqueaReintento;
      }
    }
}
  
  