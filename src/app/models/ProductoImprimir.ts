export class ProductoImprimir{
  codigo? : string;
  nombre? : string;
  color? : string;
  talle? : string;
  
  constructor(data?: any) {
    if (data) {
      this.nombre = data.nombre;
      this.codigo = data.codigo;
      this.color = data.color;
      this.talle = data.talle;
    }
  }
}

