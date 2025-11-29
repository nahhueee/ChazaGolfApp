export class Producto {
    id : number = 0;
    codigo? : string;
    nombre? : string;
    empresa?: string;
    cliente?: number;
    proceso?: number;
    tipo?: TipoProducto;
    subtipo?: SubtipoProducto;
    color?:Color;
    genero?: Genero;
    temporada?: Temporada;
    material?: Material;
    moldeleria?: number;
    imagen: string = "";
    talles?: TallesProducto[];
    relacionados: Relacionado[] = [];
    activo:boolean;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.codigo = data.codigo;
          this.nombre = data.nombre;
          this.empresa = data.empresa;
          this.cliente = data.cliente;
          this.proceso = data.proceso;
          this.tipo = data.tipo;
          this.subtipo = data.subtipo;
          this.genero = data.genero;
          this.material = data.material;
          this.moldeleria = data.moldeleria;
          this.temporada = data.temporada;
          this.color = data.color;
          this.talles = Array.isArray(data.talles) ? data.talles.map((talleData: any) => new TallesProducto(talleData)) : [];
          this.relacionados = Array.isArray(data.relacionados) ? data.relacionados.map((relacionadoData: any) => new Relacionado(relacionadoData)) : [];
        } 
    }
}

export class TablaProducto {
    id : number = 0;
    codigo? : string;
    nombre? : string;
    proceso?: string;
    abrevProceso?: string;
    tipo?: string;
    subtipo?: string;
    genero?: string;
    abrevGenero?: string;
    temporada?: string;
    abrevTemporada?: string;
    material?: string;
    color?: string;
    hexa?: string;
    moldeleria?: number;
    imagen?: string;

    t1:number = 0;
    t2:number = 0;
    t3:number = 0;
    t4:number = 0;
    t5:number = 0;
    t6:number = 0;
    t7:number = 0;
    t8:number = 0;
    t9:number = 0;
    t10:number = 0;

    total:number = 0;
}

export class Proceso {
    id?:number;
    descripcion?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
        }
    }
}
export class TipoProducto {
    id?:number;
    descripcion?:string;
    abreviatura?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.abreviatura = data.abreviatura;
        }
    }
}
export class SubtipoProducto {
    id?:number;
    descripcion?:string;
    abreviatura?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.abreviatura = data.abreviatura;
        }
    }
}
export class Genero {
    id?:number;
    descripcion?:string;
    abreviatura?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.abreviatura = data.abreviatura;
        }
    }
}
export class Temporada {
    id?:number;
    descripcion?:string;
    abreviatura?:string;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.abreviatura = data.abreviatura;
        }
    }
}
export class LineasTalle {
    id?:number;
    talles?:string[] = [];

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.talles = data.talles;
        }
    }
}
export class Material {
    id?:number;
    descripcion?:string;
    colores?:Color[] = []

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
        }
    }
}
export class Color {
    id?:number = 0;
    descripcion?:string;
    hexa?:string;
    seleccionado?:boolean;

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.descripcion = data.descripcion;
          this.hexa = data.hexa;
        }
    }
}
export class TallesProducto {
    id:number = 0;
    ubicacion?:number;
    talle?:string;
    idLineaTalle?:number;
    cantidad?:number;
    precio?:number;
    cantAgregar?:number = 0; //Propiedad para generar una venta
    disponible?:number = 0; //Propiedad para nota de empaque
    vendido?:number = 0; //Propiedad para nota de empaque

    constructor(data?: any) {
        if (data) {
          this.id = data.id;
          this.ubicacion = data.ubicacion;
          this.talle = data.talle;
          this.cantidad = data.cantidad;
          this.precio = data.precio;
          this.idLineaTalle = data.idLineaTalle;
        }
    }
}

export class TalleSeleccionable{
  talle?:string;
  seleccionado?:boolean;

  constructor(data?: any) {
    if (data) {
        this.talle = data.talle;
        this.seleccionado = data.seleccionado;
    }
}
}

export class Relacionado {
    idProducto?:number;
    color?:Color;
    talles?:TallesProducto[] = []

    constructor(data?: any) {
        if (data) {
          this.idProducto = data.idProducto;
          this.color = data.color;
        }
    }
}

export class ProductoBusqueda{
    codigo:string;
    nombre:string;
}

export class ColorDisponible{
    idProducto:number;
    color:string;
    hexa:string;
}

