import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from "ngx-spinner";
import { Usuario } from '../../../models/Usuario';
import { Router } from '@angular/router';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { UsuariosService } from '../../../services/usuarios.service';
import { ParametrosService } from '../../../services/parametros.service';
import { FORMS_IMPORTS } from '../../../imports/forms.import';

@Component({
  selector: 'app-login.component',
  standalone: true,
  imports: [
    ...FORMS_IMPORTS,
    NgxSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  //Fondos tema claro
  backsWhite = [
    {path: "backgrounds/white/1.jpg"},
    {path: "backgrounds/white/2.jpg"},
    {path: "backgrounds/white/3.jpg"},
    {path: "backgrounds/white/4.jpg"},
    {path: "backgrounds/white/5.jpg"},
    {path: "backgrounds/white/6.jpg"},
  ];

  //Fondos tema oscuro
  backsDark = [
    {path: "backgrounds/dark/1.jpg"},
    {path: "backgrounds/dark/2.jpg"},
    {path: "backgrounds/dark/3.jpg"},
    {path: "backgrounds/dark/4.jpg"},
    {path: "backgrounds/dark/5.jpg"},
    {path: "backgrounds/dark/6.jpg"},
  ];

  nombre = "";
  background:string;
  pathIcon:string;
  formulario: FormGroup;
 
  usuario:Usuario;
  esAdmin:boolean;
  esDark:boolean;

  constructor(
    private router:Router,
    private Notificaciones:NotificacionesService,
    private usuariosService:UsuariosService,
    private spinner: NgxSpinnerService,
  ) {
    this.formulario = new FormGroup({
      usuario: new FormControl('', [Validators.required]),
      pass: new FormControl('', [Validators.required]),
    });

    this.esDark = localStorage.getItem('theme') === 'dark';
  }

  ngOnInit(): void {
    // Revisa si el tema es white o dark, luego obtiene una imagen de fondo al azar dependiendo el tema
    // El color del icono cambia segun el tema
    if(this.esDark){
      this.background = this.backsDark[Math.floor(Math.random() * this.backsDark.length)].path;
      this.pathIcon = "IconoWhite.png"
    }else{
      this.background = this.backsWhite[Math.floor(Math.random() * this.backsWhite.length)].path;
      this.pathIcon = "IconoBlack.png"
    }
  }

  Ingresar(){
    if(this.formulario.invalid) return;

    this.usuariosService.ObtenerUsuarioxUsername(this.formulario.get("usuario")?.value)
    .subscribe(response=> {
      if (response) {
        this.usuario = response;
        const sesion = {
          data: { 
            idUsuario: this.usuario.id?.toString()!,
            nombre: this.usuario.nombre!,
            cargo: this.usuario.cargo!
          },
          timestamp: new Date().getTime(), // guardás el momento actual
        };
        localStorage.setItem('sesion', JSON.stringify(sesion));
        this.spinner.show("welcomeSpinner");
        
        this.nombre = this.usuario.nombre!;

        setTimeout(() => {
          this.spinner.hide("welcomeSpinner");
          this.router.navigate(['inicio'])
        }, 2500);

      } else{
        this.Notificaciones.Warn("Usuario o contraseña incorrecto");
        this.formulario.get("pass")?.setValue("");
      }
    });    
   
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control && control.invalid && control.dirty);
  }
}
