export interface FondoConSaldo {
  idFondo: number;
  nombre:  string;
  tipo:    string;
  saldo:   number;
  icono:       string;
}

export interface Caja {
  id:     number;
  nombre: string;
  fondos: FondoConSaldo[];
}

export interface SeleccionFondo {
  idCaja:  number;
  idFondo: number;
  cajaNombre:  string;
  fondoNombre: string;
  saldo:       number;
}