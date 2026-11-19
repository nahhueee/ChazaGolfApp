// Catálogos administrables (Administración > Catálogos). Espejo de CatalogosRepo en el backend.
export interface CatalogoItem {
  id: number;
  descripcion: string;
  orden: number;
  fechaBaja: string | null;
  usuarioBaja: string | null;
  // Cantidad de registros que usan el valor (hoy: comprobantes que lo tienen como motivo).
  enUso: number;
  // El backend no deja renombrar un valor que ya se usó (los comprobantes lo guardan como texto).
  descripcionBloqueada: boolean;
}

export type TipoCampoCatalogo = 'texto' | 'numero' | 'color' | 'abreviatura';

export interface CampoCatalogo {
  key: string;
  label: string;
  tipo: TipoCampoCatalogo;
  requerido?: boolean;
  maxLength?: number;
}

export interface CatalogoConfig {
  // Clave del catálogo en la API (/catalogos/:clave) y en la ruta.
  clave: string;
  titulo: string;
  subtitulo?: string;
  campos: CampoCatalogo[];
  mostrarEnUso?: boolean;
}
