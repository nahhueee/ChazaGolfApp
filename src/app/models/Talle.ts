export class Talle{
  id? : number = 0;
  descripcion?: string = "";
  idLineaTalle?: number = 0;

  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.descripcion = data.descripcion
      this.idLineaTalle = data.idLineaTalle;
    }
  }
}

