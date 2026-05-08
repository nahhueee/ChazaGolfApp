import { Cargo } from "./Cargo";

export class Usuario{
  id? : number;
  usuario?: string;
  nombre?: string;
  email?: string;
  pass?: string;
  idCaja: number;
 
  cargo?: Cargo = new Cargo();

  constructor(data?: any) {
    if (data) {
      this.id = data.id;
      this.usuario = data.usuario;
      this.nombre = data.nombre;
      this.email = data.email;
      this.pass = data.pass;
      this.idCaja = data.idCaja;
      this.cargo = new Cargo({
        id: data.idCargo,
        nombre: data.cargo
      });
    }
  }
}

