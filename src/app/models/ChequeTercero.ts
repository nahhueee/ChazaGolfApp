export type EstadoChequeTercero = 'PENDIENTE' | 'ENDOSADO' | 'ACREDITADO' | 'RECHAZADO';

// Cheque recibido de un cliente (valores_acreditar tipo CHEQUE) en cualquier estado.
export interface ChequeTercero {
  id: number;
  idEmpresa: number;
  estado: EstadoChequeTercero;
  monto: number;
  cliente: string | null;
  chequeNumero: string | null;
  chequeBanco: string | null;
  chequeLibradorNombre: string | null;
  chequeFechaCobro: string | null;
  diasParaCobro: number | null;
  // Dónde terminó
  proveedorEndoso: string | null;
  fechaEndoso: string | null;
  fondoDestino: string | null;
  fechaAcreditacion: string | null;
  observaciones: string | null;
}

export interface FiltroChequesTerceros {
  estado?: EstadoChequeTercero;
  idEmpresa?: number;
  fechaCobroDesde?: string;
  fechaCobroHasta?: string;
  limite?: number;
}
