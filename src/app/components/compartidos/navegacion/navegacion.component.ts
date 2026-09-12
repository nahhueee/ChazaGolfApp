import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { TemaService } from '../../../services/tema.service';
import { TooltipModule } from 'primeng/tooltip';
import { UsuariosService } from '../../../services/usuarios.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navegacion',
  standalone: true,
  imports: [
    MenubarModule,
    ButtonModule,
    NgxSpinnerModule,
    TooltipModule
  ],
  templateUrl: './navegacion.component.html',
  styleUrl: './navegacion.component.scss',
})
export class NavegacionComponent {
  items: MenuItem[] = [];
  esDark: boolean = false;
  activo: string = 'inicio';

  // Pill de ambiente en el menú: solo se muestra fuera de producción real. No usamos
  // environment.production para esto porque environment.test.ts también lo deja en true
  // (build optimizado apuntando a la API de test) - ver environment.envName.
  nombreEntorno: string = environment.envName.toUpperCase();
  esProduccion: boolean = environment.envName === 'production';

  constructor(
    private router:Router,
    private temaService:TemaService,
    private usuariosService:UsuariosService,
  ){}

  ngOnInit() {
    const sesion = this.usuariosService.GetSesion();
    if (!sesion) {
      this.router.navigateByUrl('/ingresar');
      return;
    }

    // Se sacó el chequeo de "más de 30 min desde el login -> forzar logout" (IsSesionValida):
    // era un parche para el viejo session.json que se pisaba entre logins concurrentes, y quedó
    // inconsistente con el JWT (expira a las 12hs, validado en el backend). El único disparador
    // de logout forzado ahora es el 401 real de un token vencido/inválido (ver
    // http-error-handler.service.ts / api.service.ts).
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.ActualizarActivo(event.urlAfterRedirects);
      }
    });

    this.esDark = localStorage.getItem('theme') === 'dark';
    this.items = this.ConstruirItems();
  }

  // Modelo único para p-menubar. Se reconstruye en cada navegación (ver ActualizarActivo)
  // para poder marcar con styleClass el dominio top-level activo, ya que p-menubar no
  // resalta automáticamente un padre cuando la ruta activa es de un hijo suyo.
  ConstruirItems(): MenuItem[] {
    return [
      {
        label: 'Fondos',
        icon: 'pi pi-chart-bar',
        styleClass: this.activo === 'fondos' ? 'activo' : undefined,
        routerLink: '/fondos',
      },
      {
        label: 'Ventas',
        icon: 'pi pi-money-bill',
        styleClass: this.activo === 'ventas' ? 'activo' : undefined,
        items: [
          {
            label: 'Facturación',
            items: [
              { label: 'Facturar', icon: 'pi pi-plus', routerLink: ['/ventas/administrar', 0], queryParams: { tipo: 'factura' } },
              { label: 'Listado', icon: 'pi pi-list', routerLink: ['/ventas'], queryParams: { tipo: 'factura' } }
            ]
          },
          {
            label: 'Pre-Facturación',
            items: [
              { label: 'Nuevo', icon: 'pi pi-plus', routerLink: ['/ventas/administrar', 0], queryParams: { tipo: 'pre' } },
              { label: 'Listado', icon: 'pi pi-list', routerLink: ['/ventas'], queryParams: { tipo: 'pre' } }
            ]
          },
        ]
      },
      {
        label: 'Compras',
        icon: 'pi pi-shopping-cart',
        styleClass: this.activo === 'compras' ? 'activo' : undefined,
        items: [
          {
            label: 'Compras',
            items: [
              { label: 'Nueva', icon: 'pi pi-plus', routerLink: '/compras/add' },
              { label: 'Listado', icon: 'pi pi-list', routerLink: '/compras' }
            ]
          },
          {
            label: 'Proveedores',
            items: [
              { label: 'Nuevo', icon: 'pi pi-plus', routerLink: '/proveedores/add' },
              { label: 'Listado', icon: 'pi pi-list', routerLink: '/proveedores' },
              { label: 'Cuentas Corrientes', icon: 'pi pi-wallet', routerLink: '/compras/cuentas' }
            ]
          },
        ]
      },
      {
        label: 'Stock',
        icon: 'pi pi-box',
        styleClass: this.activo === 'stock' ? 'activo' : undefined,
        items: [
          {
            label: 'Productos',
            items: [
              { label: 'Nuevo', icon: 'pi pi-plus', routerLink: '/productos/add' },
              { label: 'Listado', icon: 'pi pi-list', routerLink: '/productos' },
              { label: 'Prod Presupuesto', icon: 'pi pi-wallet', routerLink: '/productos-presupuesto' }
            ]
          },
          { label: 'Servicios', routerLink: '/servicios' },
          {
            label: 'Órdenes de Ingreso',
            items: [
              { label: 'Nuevo', icon: 'pi pi-plus', routerLink: ['/ordenes-ingreso/adm', 0] },
              { label: 'Listado', icon: 'pi pi-list', routerLink: '/ordenes-ingreso' }
            ]
          },
          { label: 'Ajuste de Stock', icon: 'pi pi-sliders-h', routerLink: '/stock-ajuste' }
        ]
      },
      {
        label: 'Clientes',
        icon: 'pi pi-users',
        styleClass: this.activo === 'clientes' ? 'activo' : undefined,
        items: [
          { label: 'Nuevo', icon: 'pi pi-plus', routerLink: '/clientes/add' },
          { label: 'Listado', icon: 'pi pi-list', routerLink: '/clientes' },
          { label: 'Cuentas Corrientes', icon: 'pi pi-wallet', routerLink: '/cuentas' }
        ]
      },
      {
        label: 'Administración',
        icon: 'pi pi-briefcase',
        styleClass: this.activo === 'administracion' ? 'activo' : undefined,
        routerLink: '/administracion',
      },

    ];
  }

  ActualizarActivo(url: string) {
    if (url.startsWith('/inicio')) {
      this.activo = 'inicio';
    } else if (url.startsWith('/ventas')) {
      this.activo = 'ventas';
    } else if (url.startsWith('/productos') || url.startsWith('/servicios') || url.startsWith('/ordenes-ingreso') || url.startsWith('/stock-ajuste')) {
      this.activo = 'stock';
    } else if (url.startsWith('/compras') || url.startsWith('/proveedores')) {
      this.activo = 'compras';
    } else if (url.startsWith('/clientes') || url.startsWith('/cuentas')) {
      // /cuentas (Cuentas Corrientes) cuelga del ítem "Clientes" en el menú.
      this.activo = 'clientes';
    } else if (url.startsWith('/fondos')) {
      this.activo = 'fondos';
    } else if (url.startsWith('/administracion')) {
      this.activo = 'administracion';
    } else {
      this.activo = '';
    }
    this.items = this.ConstruirItems();
  }

  Navegar(ruta:string){
    this.router.navigateByUrl(ruta);
  }

  // El botón ya existía pero solo navegaba a /ingresar sin limpiar la sesión (el
  // token JWT quedaba en localStorage). Aprovechamos este cambio para corregirlo.
  CerrarSesion(){
    this.usuariosService.CerrarSesion();
    this.router.navigateByUrl('ingresar');
  }

  //#region PERSONALIZACIÓN TEMA
  CambiarModo() {
    this.AplicarTema();
    this.temaService.SetTema(this.esDark ? 'light' : 'dark');
    this.esDark = !this.esDark;
  }

  AplicarTema(){
    const element = document.querySelector('html');
    element!.classList.toggle('dark-mode');

    // También aplica la clase al body para mayor especificidad
    document.body.classList.toggle('dark-mode');
  }
  //#endregion
}
