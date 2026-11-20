// Catálogos administrables (Administración > Catálogos). Espejo de CatalogosRepo en el backend.
export interface CatalogoItem {
  id: number;
  descripcion: string;
  abreviatura?: string;
  // No todos los catálogos tienen orden (los de producto van por descripción).
  orden?: number;
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
  // Aviso que se muestra en el diálogo al cambiar este campo de un registro en uso. '{n}' = cantidad en uso.
  avisoCambioEnUso?: string;
}

export interface CatalogoConfig {
  // Clave del catálogo en la API (/catalogos/:clave) y en la ruta.
  clave: string;
  titulo: string;
  subtitulo?: string;
  campos: CampoCatalogo[];
  mostrarEnUso?: boolean;
  // Título de la columna "En uso" (default "En uso").
  etiquetaEnUso?: string;
}
