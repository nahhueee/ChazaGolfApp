export class Talle{
  id? : number = 0;
  descripcion?: string = "";

  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.descripcion = data.descripcion
    }
  }
}

