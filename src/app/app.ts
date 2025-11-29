import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { ParametrosService } from './services/parametros.service';
import { NavegacionComponent } from './components/compartidos/navegacion/navegacion.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, NavegacionComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('chazaGolfApp');
  esDark: boolean = false;
  mostrarNav = true;

  constructor(
    private router:Router,
    private parametrosService:ParametrosService)
    {

      //Oculta la navegacion en ingresar
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.mostrarNav = !event.urlAfterRedirects.startsWith('/ingresar');
        }
      });

      //Muestra la url de trabajo
      const url:string = this.parametrosService.GetDatosServidor().apiUrl!;
      console.log("Consultando a: " + url);
      
      this.esDark = localStorage.getItem('theme') === 'dark';
      if(this.esDark)
        this.AplicarTema();
    }
 
  AplicarTema(){
    const element = document.querySelector('html');
    element!.classList.toggle('dark-mode');
    
    // También aplica la clase al body para mayor especificidad
    document.body.classList.toggle('dark-mode');
  }
}
