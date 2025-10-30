import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Cliente } from '../../../../models/Cliente';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ClientesService } from '../../../../services/clientes.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';

@Component({
  selector: 'app-add-mod-clientes.component',
  standalone: true,
  imports: [],
  templateUrl: './add-mod-clientes.component.html',
  styleUrl: './add-mod-clientes.component.scss',
})
export class AddModClientesComponent {
  @Output() cerrar = new EventEmitter<boolean>(); //True: si hay que actualizar, False: si no hay que actualizar
  @Input() set clienteEditar(value: Cliente | undefined) { //Cliente a editar
    if (value){
      this.cliente = value;
      this.formulario.patchValue(value); //Si se envía un valor para editar completamos el fornulario
    } 
    else this.formulario.reset(); //Si no hay valores reiniciamos el formulario
  }

  formulario:FormGroup;
  cliente:Cliente;

  condicionesIVAReceptor: CondicionesIva[] = [];
  tiposDocumento = [
    {id: 80, descripcion: 'CUIT'},
    {id: 86, descripcion: 'CUIL'},
    {id: 96, descripcion: 'DNI'}
  ];
  condicionesPago = [
    {id: 1, descripcion: 'CONTADO'},
    {id: 2, descripcion: 'CUENTA CORRIENTE'},
    {id: 3, descripcion: 'PAGO DIGITAL'},
    {id: 4, descripcion: 'OTRO'},
  ];
  categorias = [
    {id: 1, descripcion: 'MAYORISTA'},
    {id: 2, descripcion: 'MINORISTA'},
  ];

  provincias : any[] = [];
  ciudades: any[] = [];
  calles: any[] = [];

  private cuitcuilPattern: any = /^[2037][0-9]{9}[0-9]$/;
  private dniPattern = /^[0-9]{7,8}$/;
  private emailPattern: any = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  constructor(
    private Notificaciones: NotificacionesService,
    private clientesService: ClientesService
  ) {
    this.formulario = new FormGroup({
      nombre: new FormControl('', [Validators.required]),
      
      telefono: new FormControl(''),
      celular: new FormControl(''),
      contacto: new FormControl(''),
      email: new FormControl('',[Validators.pattern(this.emailPattern)]),
      
      razon: new FormControl(''),
      condIva: new FormControl(5),
      tDocumento: new FormControl(''),
      documento: new FormControl(''),

      condPago: new FormControl(1),
      categoria: new FormControl(1),

      calle: new FormControl(''),
      numero: new FormControl(''),
      ciudad: new FormControl(''),
      provincia: new FormControl(''),
      pais: new FormControl('Argentina'),
      codPostal: new FormControl(''),
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  Guardar(){
    if(!this.formulario.valid) return;

    if(this.cliente){
      this.cliente = new Cliente();
    }

    this.cliente.nombre =  this.formulario.get('nombre')?.value;
    this.cliente.telefono =  this.formulario.get('telefono')?.value;
    this.cliente.celular =  this.formulario.get('celular')?.value;
    this.cliente.email =  this.formulario.get('email')?.value;
    this.cliente.contacto =  this.formulario.get('contacto')?.value;
    this.cliente.razonSocial =  this.formulario.get('razon')?.value;
    this.cliente.idTipoDocumento =  this.formulario.get('tDocumento')?.value;
    this.cliente.idCondicionPago =  this.formulario.get('condPago')?.value;
    this.cliente.idCategoria =  this.formulario.get('categoria')?.value;
    this.cliente.idCondicionIva = this.formulario.get('condIva')?.value;
    this.cliente.documento = this.formulario.get('documento')?.value;
    this.cliente.direcciones = [{
      resumen: `${this.formulario.get('calle')?.value} ${this.formulario.get('numero')?.value}, ${this.formulario.get('ciudad')?.value}, ${this.formulario.get('provincia')?.value}`,
      calle: this.formulario.get('calle')?.value,
      numero: this.formulario.get('numero')?.value,
      codPostal: this.formulario.get('codPostal')?.value,
      localidad: this.formulario.get('ciudad')?.value,
      provincia: this.formulario.get('provincia')?.value,
      observaciones: ''
    }];
    
    if(this.cliente.id == 0){
      this.Agregar();      
    }else{
      this.Modificar();
    }
  }

  Agregar(){
    this.clientesService.Agregar(this.cliente)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Cliente creado correctamente");
          this.CerrarModal(true);
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  Modificar(){
    this.clientesService.Modificar(this.cliente)
      .subscribe(response => {
        if(response=='OK'){
          this.Notificaciones.Success("Cliente modificado correctamente");
          this.CerrarModal(true);
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  CerrarModal(actualizar:boolean) {
    this.cerrar.emit(actualizar);
  }
}
