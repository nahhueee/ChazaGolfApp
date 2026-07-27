export class MovimientoFondo {
  id: number;
  idCaja: number;
  idFondo: number;
  idEmpresa: number | null;
  fecha: string;
  fondo: string;
  empresa?: string;
  // Cliente o proveedor asociado al movimiento (derivado en el backend según
  // origen/tipoReferencia). Puede venir null: hay orígenes que nunca lo tienen
  // (TRANSFERENCIA, manuales sin referencia) y filas históricas de AJUSTE/
  // PAGO_CC_PROVEEDOR sin tipoReferencia poblado - no se adivina, ver
  // fondosRepository.ts.
  clienteProveedor?: string | null;
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
      | 'NOTA_CREDITO'
      | 'ACREDITACION_VALOR'
      | 'PAGO_CC_PROVEEDOR';

  descripcion: string | null;
  monto: number;
  usuario: string;
  observaciones: string;
}