import { Routes } from '@angular/router';
import { LoginComponent } from './components/contenido/login/login.component';
import { InicioComponent } from './components/contenido/inicio/inicio.component';
import { FacturarComponent } from './components/contenido/ventas/facturar/facturar.component';
import { ListadoClientesComponent } from './components/contenido/clientes/listado-clientes/listado-clientes.component';
import { AddModClientesComponent } from './components/contenido/clientes/add-mod-clientes/add-mod-clientes.component';
import { ListadoVentasComponent } from './components/contenido/ventas/listado-ventas/listado-ventas.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'inicio',
        pathMatch: 'full'
    },
    {
        path: 'ingresar',
        component: LoginComponent
    },
    {
        path: 'inicio',
        component:InicioComponent
    },
    {
        path: 'ventas',
        component:ListadoVentasComponent
    },
    {
        path: 'ventas/administrar/:id',
        component:FacturarComponent
    },
    {
        path: 'clientes',
        component:ListadoClientesComponent
    },
    {
        path: 'clientes/add',
        component:AddModClientesComponent
    },
];
