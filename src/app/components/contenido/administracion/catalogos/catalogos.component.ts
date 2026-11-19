import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';

import { EncabezadoSeccionComponent } from '../../../compartidos/encabezado-seccion/encabezado-seccion.component';
import { CatalogoConfig } from '../../../../models/Catalogo';
import { UsuariosService } from '../../../../services/usuarios.service';
import { AbmCatalogoComponent } from './abm-catalogo/abm-catalogo.component';

// Un tab por catálogo. Para sumar uno nuevo: agregarlo acá (y whitelisted en CATALOGOS del backend).
const CATALOGOS: CatalogoConfig[] = [
  {
    clave: 'motivos-sin-productos',
    titulo: 'Motivos sin productos',
    subtitulo: 'Motivos que se eligen en la Factura de adelanto y en la NC X "sin productos o servicios".',
    campos: [
      { key: 'descripcion', label: 'Descripción', tipo: 'texto', requerido: true, maxLength: 100 },
      { key: 'orden', label: 'Orden', tipo: 'numero' },
    ],
    mostrarEnUso: true,
  },
];

// Pantalla "Administración > Catálogos". Solo ADMINISTRADOR (la card está oculta para el resto y acá se
// redirige si entran por URL; las escrituras igual las bloquea el backend).
@Component({
  selector: 'app-catalogos',
  standalone: true,
  imports: [TabsModule, EncabezadoSeccionComponent, AbmCatalogoComponent],
  templateUrl: './catalogos.component.html',
  styleUrl: './catalogos.component.css',
})
export class CatalogosComponent implements OnInit {
  readonly catalogos = CATALOGOS;
  actual: CatalogoConfig = CATALOGOS[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usuariosService: UsuariosService,
  ) {}

  ngOnInit(): void {
    if (this.usuariosService.GetCargoSesion() !== 'ADMINISTRADOR') {
      this.router.navigateByUrl('/administracion');
      return;
    }
    this.route.paramMap.subscribe(params => {
      this.actual = CATALOGOS.find(c => c.clave === params.get('catalogo')) ?? CATALOGOS[0];
    });
  }

  CambiarTab(valor: string | number | undefined): void {
    if (valor == null || valor === this.actual.clave) return;
    this.router.navigate(['/administracion/catalogos', String(valor)]);
  }
}
