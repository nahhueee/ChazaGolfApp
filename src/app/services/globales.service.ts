import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalesService {
  constructor() {}

  //Metodo para Estandarizar los nros decimales
  EstandarizarDecimal(numero:string):number{
    if(numero == "") return 0;
    const formatNro = numero.replace(/\./g, '').replace(',', '.');

    return parseFloat(formatNro);
  }

}
