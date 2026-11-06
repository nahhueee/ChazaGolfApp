export class MetodoPago {
    id?:number;
    descripcion?:string;
    tipo?:string;
    idFondo?:number; // fondo del método; para TRANSFERENCIA es el banco (lo usa el combo de cuentas del cheque propio)
    fondo?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.tipo = data.tipo;
          this.idFondo = data.idFondo;
          this.fondo = data.fondo;
        }
    }
}