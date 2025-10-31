import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TemaService {
  private themeSubject = new BehaviorSubject<string>(localStorage.getItem('theme') || 'light');
  theme$ = this.themeSubject.asObservable();

  /** Cambia el tema y notifica a todos los que estén suscritos */
  SetTema(theme: 'light' | 'dark') {
    localStorage.setItem('theme', theme);
    this.themeSubject.next(theme);
  }

  get TemaActual() {
    return this.themeSubject.value;
  }
}
