import { PagosFactura } from "./Factura";

export class ObjFacturar {
    total?:number;
    neto?:number;
    iva?:number;
    tipoComprobante?: TipoComprobante;
    tipoFacturaDesc?:string;
    docNro?:number;
    docTipo?:number;
    docTipoDesc?:string;
    condReceptor?:number;
    condicion?:string;
    cliente?:string;
    empresa?:string;
    idEmpresa?:number;
    pagos:PagosFactura[] = [];

    // SOLO para Notas
    comprobanteAsociado?: {
        tipo: TipoComprobante;
        puntoVenta: number;
        numero: number;
    };
}

export enum TipoComprobante {
  FACTURA_A = 1,
  ND_A = 2,
  NC_A = 3,

  FACTURA_B = 6,
  ND_B = 7,
  NC_B = 8,

  FACTURA_C = 11,
  ND_C = 12,
  NC_C = 13,

  COTIZACION = 99,
  NC_X = 100
}