export class StockMovimiento {
  id?: number;
  idProducto: number = 0;
  producto?: string;
  codigoProducto?: string;
  colorProducto?: string;
  hexaProducto?: string;
  talle: string = '';
  idTalle?: number | null;
  cantidadAnterior?: number;
  cantidadNueva?: number;
  diferencia?: number;
  motivo?: string;
  usuario?: string;
  alta?: Date;
  baja?: Date | null;
  motivoBaja?: string | null;
  usuarioBaja?: string | null;
}
