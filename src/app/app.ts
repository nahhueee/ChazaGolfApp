import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('chazaGolfApp');
  esDark: boolean = false;

  constructor(){
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
