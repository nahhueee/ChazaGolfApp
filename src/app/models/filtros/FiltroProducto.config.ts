import { FormControl } from '@angular/forms';

export type PropKey = 'procesos' | 'codigo' | 'tipos' | 'subtipos' | 'generos' | 'materiales' | 'colores' | 'temporadas' ;

export interface FiltroConfig {
  data: any[];
  filtrado: any[];
  seleccionado: number;
  control: FormControl;
  placeholder: string;
}

export const crearFiltros = (): Record<PropKey, FiltroConfig> => ({
  procesos: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Proceso',
  },
  codigo:{
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Codigo',
  },
  tipos: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Producto',
  },
  subtipos: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Tipo',
  },
  generos: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Género',
  },
  materiales: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Material',
  },
  colores: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Color',
  },
  temporadas: {
    data: [],
    filtrado: [],
    seleccionado: 0,
    control: new FormControl(null),
    placeholder: 'Temporada',
  },
});
