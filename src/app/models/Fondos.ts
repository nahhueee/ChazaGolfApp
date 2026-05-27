
export class Caja {
  id: number;
  nombre: string;
}

export interface ResumenCaja {
  saldoTotal:                number;
  ingresosDia:               number;
  egresosDia:                number;
  netoDia:                   number;
  cuentaCorrienteClientes:   number;
  saldoFavorClientes:        number;
}

export class ResumenFondo {
  id:              number;
  nombre:          string;
  tipo:            string;  
  icono:           string;
  saldoTotal:      number;  
  ingresosPeriodo: number;  
  egresosPeriodo:  number;  
  netoPeriodo:     number;  
  movimientos:     number;
}

export interface DetalleMetodoPago {
  idFondo:             number;
  fondo:               string;
  tipo:                string;
  icono:               string;
  total_credito:       number;
  total_debito:        number;
  total_transferencia: number;
  total_digital:       number;
  total_efectivo:      number;
  total_general:       number;
}

export class FiltrosFondos {
  pagina:       number  = 1;
  tamanioPagina: number = 10;
  idCaja?:      number;
  idFondo?:     number;
  fechaDesde?:  string | null;
  fechaHasta?:  string | null;
  usuario?:     string | null;
}