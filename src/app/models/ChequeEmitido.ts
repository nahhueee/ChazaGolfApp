// Datos del cheque propio (chequera física o eCheq) que viajan dentro de una pierna de pago de Compras.
// El importe NO va acá: es el monto de la pierna. Las fechas son strings YYYY-MM-DD (no Date) para que
// la zona horaria no corra el día al serializar.
export class ChequePropioDTO {
  idFondoBanco: number = 0; // cuenta de la que se libra (fondo BANCARIO de la empresa)
  tipo: 'FISICO' | 'ECHEQ' = 'FISICO';
  numero: string = '';
  fechaEmision: string = '';
  fechaPago: string = '';
  observaciones?: string;
}

export type EstadoChequeEmitido = 'EMITIDO' | 'DEBITADO' | 'ANULADO';

// Fila del panel "Cheques emitidos" (POST cheques-emitidos/obtener).
export interface ChequeEmitido {
  id: number;
  idEmpresa: number;
  idFondoBanco: number;
  idProveedor: number;
  tipo: 'FISICO' | 'ECHEQ';
  numero: string;
  importe: number;
  fechaEmision: string;
  fechaPago: string;
  estado: EstadoChequeEmitido;
  proveedor: string | null;
  banco: string | null;
  diasParaPago: number;
  fechaDebito?: string | null;
  usuarioDebito?: string | null;
  observaciones?: string | null;
}

export interface FiltroChequesEmitidos {
  estado?: EstadoChequeEmitido;
  idEmpresa?: number;
  idFondoBanco?: number;
  fechaPagoDesde?: string;
  fechaPagoHasta?: string;
  limite?: number; // tope de filas (pantalla informativa); Fondos no lo manda
}
