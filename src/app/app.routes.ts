import { Routes } from '@angular/router';
import { LoginComponent } from './components/contenido/login/login.component';
import { InicioComponent } from './components/contenido/inicio/inicio.component';
import { AddModVentasComponent } from './components/contenido/ventas/addmod-ventas/addmod-ventas.component';
import { ListadoClientesComponent } from './components/contenido/clientes/listado-clientes/listado-clientes.component';
import { AddModClientesComponent } from './components/contenido/clientes/addmod-clientes/addmod-clientes.component';
import { ListadoVentasComponent } from './components/contenido/ventas/listado-ventas/listado-ventas.component';
import { ListadoProductosComponent } from './components/contenido/productos/listado-productos/listado-productos.component';
import { AddmodProductosComponent } from './components/contenido/productos/addmod-productos/addmod-productos.component';
import { PresupuestoProductosComponent } from './components/contenido/productos/presupuesto-productos.component/presupuesto-productos.component';
import { ServiciosComponent } from './components/contenido/servicios/listado-servicios.component';
import { ListadoCuentasComponent } from './components/contenido/cuentas/listado-cuentas/listado-cuentas.component';
import { VentasClienteComponent } from './components/contenido/cuentas/ventas-cliente/ventas-cliente.components';
import { EstadisticaClientes } from './components/contenido/clientes/estadistica-clientes/estadistica-clientes.component';
import { ListadoOrdenesComponent } from './components/contenido/ordenes/listado-ordenes/listado-ordenes.component';
import { AddmodOrdenesComponent } from './components/contenido/ordenes/addmod-ordenes/addmod-ordenes.component';
import { MainFondosComponent } from './components/contenido/fondos/main-fondos/main-fondos.component';
import { ListadoProveedoresComponent } from './components/contenido/proveedores/listado-proveedores/listado-proveedores.component';
import { AddModProveedoresComponent } from './components/contenido/proveedores/addmod-proveedores/addmod-proveedores.component';
import { ListadoComprasComponent } from './components/contenido/compras/listado-compras/listado-compras.component';
import { AddModComprasComponent } from './components/contenido/compras/addmod-compras/addmod-compras.component';
import { ListadoCuentasProveedoresComponent } from './components/contenido/compras/listado-cuentas-proveedores/listado-cuentas-proveedores.component';
import { CuentaProveedorComponent } from './components/contenido/compras/cuenta-proveedor/cuenta-proveedor.component';

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
        path: 'clientes/estadisticas/:idCliente/:cliente',
        component:EstadisticaClientes
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
    {
        path: 'productos-presupuesto',
        component:PresupuestoProductosComponent
    },
    {
        path: 'servicios',
        component:ServiciosComponent
    },
    {
        path: 'cuentas',
        component:ListadoCuentasComponent
    },
    {
        path: 'cuentas/administrar/:idCliente/:cliente',
        component:VentasClienteComponent
    },
    {
        path: 'ordenes-ingreso',
        component:ListadoOrdenesComponent
    },
    {
        path: 'ordenes-ingreso/adm/:idOrden',
        component:AddmodOrdenesComponent
    },
    {
        path: 'fondos',
        component:MainFondosComponent
    },
    {
        path: 'proveedores',
        component:ListadoProveedoresComponent
    },
    {
        path: 'proveedores/add',
        component:AddModProveedoresComponent
    },
    {
        path: 'compras',
        component:ListadoComprasComponent
    },
    {
        path: 'compras/add',
        component:AddModComprasComponent
    },
    {
        path: 'compras/cuentas',
        component:ListadoCuentasProveedoresComponent
    },
    {
        path: 'compras/cuentas/administrar/:idProveedor/:proveedor',
        component:CuentaProveedorComponent
    },
];
