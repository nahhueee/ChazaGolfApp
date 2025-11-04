import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TemaService } from '../../../services/tema.service';

@Component({
  selector: 'app-navegacion',
  standalone: true,
  imports: [
    MenuModule,
    ButtonModule,
    NgxSpinnerModule,
  ],
  templateUrl: './navegacion.component.html',
  styleUrl: './navegacion.component.scss',
})
export class NavegacionComponent {
  itemsVenta: MenuItem[] | undefined;
  itemsProducto: MenuItem[] | undefined;
  itemsCliente: MenuItem[] | undefined;
  esDark: boolean = false;

  constructor(
    private router:Router,
    private temaService:TemaService
  ){}

  ngOnInit() {
    this.itemsVenta = [
        { label: 'Facturar', icon: 'pi pi-plus', routerLink: '/ventas/administrar/0' },
        { label: 'Listado', icon: 'pi pi-list', routerLink: '/ventas'}
    ];

    this.itemsProducto = [
        { label: 'Nuevo', icon: 'pi pi-plus', routerLink: '/productos/add' },
        { label: 'Listado', icon: 'pi pi-list', routerLink: '/productos' }
    ];

    this.itemsCliente = [
        { label: 'Nuevo', icon: 'pi pi-plus', routerLink: '/clientes/add' },
        { label: 'Listado', icon: 'pi pi-list', routerLink: '/clientes' }
    ];

    this.esDark = localStorage.getItem('theme') === 'dark';
  }

  Navegar(ruta:string){
    this.router.navigateByUrl(ruta);
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
