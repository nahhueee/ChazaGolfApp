import { Routes } from '@angular/router';
import { LoginComponent } from './components/contenido/login/login.component';
import { InicioComponent } from './components/contenido/inicio/inicio.component';
import { AddModVentasComponent } from './components/contenido/ventas/addmod-ventas/addmod-ventas.component';
import { ListadoClientesComponent } from './components/contenido/clientes/listado-clientes/listado-clientes.component';
import { AddModClientesComponent } from './components/contenido/clientes/addmod-clientes/addmod-clientes.component';
import { ListadoVentasComponent } from './components/contenido/ventas/listado-ventas/listado-ventas.component';
import { ListadoProductosComponent } from './components/contenido/productos/listado-productos/listado-productos.component';
import { AddmodProductosComponent } from './components/contenido/productos/addmod-productos.component/addmod-productos.component';

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
        component:AddModVentasComponent
    },
    {
        path: 'clientes',
        component:ListadoClientesComponent
    },
    {
        path: 'clientes/add',
        component:AddModClientesComponent
    },
    {
        path: 'productos',
        component:ListadoProductosComponent
    },
    {
        path: 'productos/add',
        component:AddmodProductosComponent
    },
];
