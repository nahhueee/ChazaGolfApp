import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Cliente } from '../../../../models/Cliente';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { ClientesService } from '../../../../services/clientes.service';
import { CondicionesIva } from '../../../../models/CondicionesIva';
import { FORMS_IMPORTS } from '../../../../imports/forms.import';
import { DireccionesService } from '../../../../services/direcciones.service';
import { MiscService } from '../../../../services/misc.service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { NavegacionComponent } from '../../../compartidos/navegacion/navegacion.component';

@Component({
  selector: 'app-addmod-clientes',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NavegacionComponent
  ],
  templateUrl: './add-mod-clientes.component.html',
  styleUrl: './add-mod-clientes.component.scss',
})
export class AddModClientesComponent {
  @Output() cerrar = new EventEmitter<boolean>(); //True: si hay que actualizar, False: si no hay que actualizar
  @Input() set clienteEditar(value: Cliente | undefined) { //Cliente a editar
    if (value){
      this.cliente = value;
      this.CompletarCampos(value);
    } 
    else this.formulario.reset(); //Si no hay valores reiniciamos el formulario
  }

  formulario:FormGroup;
  cliente:Cliente;
  desdeRouting:boolean;

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
  provinciasFiltrado : any[] = [];
  ciudades: any[] = [];
  calles: any[] = [];

  private cuitcuilPattern: any = /^[2037][0-9]{9}[0-9]$/;
  private dniPattern = /^[0-9]{7,8}$/;
  private emailPattern: any = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  constructor(
    private Notificaciones: NotificacionesService,
    private clientesService: ClientesService,
    private direccionesService: DireccionesService,
    private miscService:MiscService,
    private rutaActiva: ActivatedRoute,
    private router: Router
  ) {
    this.formulario = new FormGroup({
      nombre: new FormControl('', [Validators.required]),
      
      telefono: new FormControl(''),
      celular: new FormControl(''),
      contacto: new FormControl(''),
      email: new FormControl('',[Validators.pattern(this.emailPattern)]),
      
      razonSocial: new FormControl(''),
      condIva: new FormControl([null]),
      tDocumento: new FormControl('', [Validators.required]),
      documento: new FormControl('', [Validators.required]),

      condPago: new FormControl([null]),
      categoria: new FormControl([null]),

      calle: new FormControl(''),
      numero: new FormControl(''),
      ciudad: new FormControl(''),
      provincia: new FormControl(''),
      pais: new FormControl('Argentina'),
      codPostal: new FormControl(''),
    });
  }
  
  get documento() {
    return this.formulario.get('documento');
  }

  get tiposDocumentoFiltrados() {
    if (this.formulario.get('tFactura')?.value == 1) {
      return this.tiposDocumento.filter(doc => doc.id === 80); // Solo CUIT
    }
    return this.tiposDocumento;
  }

  get calleControl() {return this.formulario.get('calle');}
  get ciudadControl() {return this.formulario.get('ciudad');}
  get provinciaControl() {return this.formulario.get('provincia');}
  get nroControl() {return this.formulario.get('numero');}
  get codPostalControl() {return this.formulario.get('codPostal');}

  ngOnInit(): void {
    const path = this.rutaActiva.snapshot.routeConfig?.path;
    if(path === 'clientes/add'){
      this.desdeRouting = true;
    }

    this.ObtenerCondiciones();
    this.ObtenerProvincias();

    this.formulario.get('categoria')?.setValue(this.categorias[0]);
    this.formulario.get('condPago')?.setValue(this.condicionesPago[0]);
  
    //valida DNI o CUIT CUIL respectivamente
    this.formulario.get('tDocumento')?.valueChanges.subscribe(valor => {
      const docCtrl = this.formulario.get('documento');
      docCtrl?.clearValidators();
  
      if (valor.id === 96) { //DNI
        docCtrl?.setValidators([Validators.required, Validators.pattern(this.dniPattern)]);
      } else if (valor.id === 80 || valor.id === 86) { //CUIT CUIL
        docCtrl?.setValidators([Validators.required, Validators.pattern(this.cuitcuilPattern)]);
      }
  
      docCtrl?.updateValueAndValidity();
    });

  }

  //#region VARIOS
  CompletarCampos(cliente){
    this.formulario.get('nombre')?.setValue(cliente.nombre);
    this.formulario.get('celular')?.setValue(cliente.celular);
    this.formulario.get('contacto')?.setValue(cliente.contacto);
    this.formulario.get('telefono')?.setValue(cliente.telefono);
    this.formulario.get('email')?.setValue(cliente.email);
    this.formulario.get('razonSocial')?.setValue(cliente.razonSocial);
    this.formulario.get('documento')?.setValue(cliente.documento);

    let condicionIva = this.condicionesIVAReceptor.find(c => c.id == cliente.idCondicionIva);
    if(condicionIva) this.formulario.get('condIva')?.setValue(condicionIva);

    let condicionPago = this.condicionesPago.find(c => c.id == cliente.idCondicionPago);
    if(condicionPago) this.formulario.get('condPago')?.setValue(condicionPago);

    let categoria = this.categorias.find(c => c.id == cliente.idCategoria);
    if(categoria) this.formulario.get('categoria')?.setValue(categoria);

    let tipoDocumento = this.tiposDocumento.find(c => c.id == cliente.idTipoDocumento);
    if(tipoDocumento) this.formulario.get('tDocumento')?.setValue(tipoDocumento);

    if(cliente.direcciones && cliente.direcciones.length>0){
      const direccion = cliente.direcciones[0];
      this.formulario.get('calle')?.setValue(direccion.calle);
      this.formulario.get('numero')?.setValue(direccion.numero);
      this.formulario.get('ciudad')?.setValue(direccion.localidad);
      this.formulario.get('provincia')?.setValue(direccion.provincia);
      this.formulario.get('codPostal')?.setValue(direccion.codPostal);
    }
  }
  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }

  SelectContent(event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  ObtenerProvincias(){
    this.direccionesService.ObtenerProvincias()
      .subscribe(response => {
        this.provincias = response;
      });
  }

  ObtenerCondiciones(){
    this.miscService.ObtenerCondicionesIva()
      .subscribe(response => {
        this.condicionesIVAReceptor = response;
        this.formulario.get('condIva')?.setValue(this.condicionesIVAReceptor[0]);
      });
  }

  FiltrarProvincias(event: any) {
    const query = event.query.toLowerCase();
    this.provinciasFiltrado = this.provincias.filter(p => {
      const nombre = p.nombre!.toLowerCase();
      return nombre.includes(query);
    });
  }
  
  FiltrarCiudades(event: any) {
    const query = event.query.toLowerCase();

    if (query.length < 3) {
      this.ciudades = []; 
      return;
    }

    this.direccionesService.ObtenerLocalidades(this.provinciaControl?.value.nombre, query)
    .subscribe(response => {
      this.ciudades = response;
    });
  }

  FiltrarCalles(event: any) {
    const query = event.query.toLowerCase();

    if (query.length < 3) {
      this.calles = []; 
      return;
    }

    this.direccionesService.ObtenerCalles(this.ciudadControl?.value.nombre, query)
    .subscribe(response => {
      this.calles = response;
    });
  }
  //#endregion

  Guardar(){
    this.markFormTouched(this.formulario);
    if(!this.formulario.valid) return;

    if(!this.cliente){
      this.cliente = new Cliente();
    }

    this.cliente.nombre =  this.formulario.get('nombre')?.value;
    this.cliente.telefono =  this.formulario.get('telefono')?.value;
    this.cliente.celular =  this.formulario.get('celular')?.value;
    this.cliente.email =  this.formulario.get('email')?.value;
    this.cliente.contacto =  this.formulario.get('contacto')?.value;
    this.cliente.razonSocial =  this.formulario.get('razonSocial')?.value;
    this.cliente.idTipoDocumento =  this.formulario.get('tDocumento')?.value.id;
    this.cliente.idCondicionPago =  this.formulario.get('condPago')?.value.id;
    this.cliente.idCategoria =  this.formulario.get('categoria')?.value.id;
    this.cliente.idCondicionIva = this.formulario.get('condIva')?.value.id;
    this.cliente.documento = this.formulario.get('documento')?.value;
    this.cliente.direcciones = [{
      resumen: `${this.formulario.get('calle')?.value.nombre} ${this.formulario.get('numero')?.value}, ${this.formulario.get('ciudad')?.value.nombre}, ${this.formulario.get('provincia')?.value.nombre}`,
      calle: this.formulario.get('calle')?.value.nombre,
      numero: this.formulario.get('numero')?.value,
      codPostal: this.formulario.get('codPostal')?.value,
      localidad: this.formulario.get('ciudad')?.value.nombre,
      provincia: this.formulario.get('provincia')?.value.nombre,
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
          if(this.desdeRouting)
            this.router.navigateByUrl('/clientes');
          else
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
          if(this.desdeRouting)
            this.router.navigateByUrl('/clientes');
          else
            this.CerrarModal(true);
        }else{
          this.Notificaciones.Warn(response);
        }
      });
  }

  CerrarModal(actualizar:boolean) {
    this.cerrar.emit(actualizar);
  }

  //Marca los campos del formulario como tocados para validar
  markFormTouched(control: AbstractControl) {
    if (control instanceof FormGroup || control instanceof FormArray) {
      Object.values(control.controls).forEach(c => this.markFormTouched(c));
    } else {
      control.markAsTouched();
      control.markAsDirty();
    }
  }
}
