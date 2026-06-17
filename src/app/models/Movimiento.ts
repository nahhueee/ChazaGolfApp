export class MovimientoFondo {
  id: number;
  idCaja: number;
  idFondo: number;
  idEmpresa: number | null;
  fecha: string;
  fondo: string;
  empresa?: string;
  tipo: 'INGRESO' | 'EGRESO';
  origen:
      | 'VENTA'
      | 'COBRO_CC'
      | 'PAGO_PROVEEDOR'
      | 'RETIRO'
      | 'AJUSTE'
      | 'TRANSFERENCIA'
      | 'INGRESO_MANUAL'
      | 'EGRESO_MANUAL'
      | 'NOTA_CREDITO';

  descripcion: string | null;
  monto: number;
  usuario: string;
  observaciones: string;
}