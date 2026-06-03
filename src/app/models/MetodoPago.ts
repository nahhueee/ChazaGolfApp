export class MetodoPago {
    id?:number;
    descripcion?:string;
    tipo?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.tipo = data.tipo;
        }
    }
}