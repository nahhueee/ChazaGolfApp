import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { Body, getClient, ResponseType } from '@tauri-apps/api/http';
import { DatosServidor } from '../models/DatosServidor';
import { NotificacionesService } from './notificaciones.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})

//Este servicio se crea dado a que si la app
//se usa en escritorio, Tauri, no permite consultas internas 
//por ejemplo http://192.168.x.x:7500, por temas de seguridad
//entonces usamos la api de tauri para este tipo de consultas
//Sin embargo, en web seguimos usando el http proporcionado de angular

export class ApiService {
  private apiUrl = '';
  private esApp:boolean;

  constructor(
    private http:HttpClient,
    private Notificaciones:NotificacionesService,
    private spinner:NgxSpinnerService,
    private router:Router) {
    this.esApp = environment.tauri;

    const datosAlmacenados = localStorage.getItem('datosServidor');

    if(datosAlmacenados==null){
      this.apiUrl = environment.apiUrl;
    }else{
      const datosServidor = new DatosServidor(JSON.parse(datosAlmacenados));
      this.apiUrl = datosServidor.apiUrl!;
    }
  }

  getFile(endpoint: string, body: any): Observable<Blob> {
    if (this.esApp) {
      return from(this.postToTauri<Blob>(endpoint, body, false)) as Observable<Blob>;
    } else {
      return this.http.post(this.apiUrl + endpoint, body, { responseType: 'blob', headers: this.getAuthHeaders() });
    }
  }

  get<T>(endpoint: string): Observable<T | null> {
    return this.esApp
      ? from(this.getFromTauri<T>(endpoint))
      : this.http.get<T>(this.apiUrl + endpoint, { headers: this.getAuthHeaders() });
  }

  post<T>(endpoint: string, body: any): Observable<T | null> {
    const isFormData = body instanceof FormData;

    return this.esApp
      ? from(this.postToTauri<T>(endpoint, body, isFormData))
      : this.http.post<T>(this.apiUrl + endpoint, body, { headers: this.getAuthHeaders() });
  }

  put<T>(endpoint: string, body: any): Observable<T | null> {
    const isFormData = body instanceof FormData;

    return this.esApp
      ? from(this.putToTauri<T>(endpoint, body, isFormData))
      : this.http.put<T>(this.apiUrl + endpoint, body, { headers: this.getAuthHeaders() });
  }

  delete<T>(endpoint: string): Observable<T | null> {
    return this.esApp
      ? from(this.deleteFromTauri<T>(endpoint))
      : this.http.delete<T>(this.apiUrl + endpoint, { headers: this.getAuthHeaders() });
  }

  // Header Authorization con el JWT de la sesión (localStorage), cuando existe.
  // Se lee directo de localStorage (mismo patrón que el constructor con
  // 'datosServidor') para no depender de UsuariosService, que a su vez depende
  // de ApiService - evita una dependencia circular.
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private getToken(): string | null {
    const raw = localStorage.getItem('sesion');
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.data?.token || null;
    } catch {
      return null;
    }
  }

  //#region METODOS INTERNOS TAURI
  private async getFromTauri<T>(endpoint: string): Promise<T | null> {
    return this.requestTauri(client =>
      client.get<T>(this.apiUrl + endpoint, {
        responseType: ResponseType.JSON,
        headers: this.getAuthHeadersTauri(),
      })
    );
  }

  public async postToTauri<T>(endpoint: string, data: any, isFormData = false): Promise<T | null> {
    const headers = { ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }), ...this.getAuthHeadersTauri() };
    const body = isFormData ? Body.form(data) : Body.json(data);

    return this.requestTauri(client =>
      client.post<T>(this.apiUrl + endpoint, body, {
        responseType: ResponseType.JSON,
        headers,
      })
    );
  }

  private async putToTauri<T>(endpoint: string, data: any, isFormData = false): Promise<T | null> {
    const headers = { ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }), ...this.getAuthHeadersTauri() };
    const body = isFormData ? Body.form(data) : Body.json(data);

    return this.requestTauri(client =>
      client.put<T>(this.apiUrl + endpoint, body, {
        responseType: ResponseType.JSON,
        headers,
      })
    );
  }

  private async deleteFromTauri<T>(endpoint: string): Promise<T | null> {
    return this.requestTauri(client =>
      client.delete<T>(this.apiUrl + endpoint, {
        responseType: ResponseType.JSON,
        headers: this.getAuthHeadersTauri(),
      })
    );
  }

  // Mismo token que getAuthHeaders(), en el formato plano que espera el cliente http de Tauri.
  private getAuthHeadersTauri(): { [key: string]: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  //#endregion

  private async requestTauri<T>(
    operation: (client: Awaited<ReturnType<typeof getClient>>) => Promise<{ data: T; status: number }>
  ): Promise<T | null>{
    try {
      this.spinner.show();
      const client = await getClient();
      const response = await operation(client);

      this.spinner.hide();
      // Si el servidor respondió pero con error HTTP
      if (response.status >= 400) {
        this.handleHttpError(response.status);
        return null;
      }

      return response.data;

    } catch (err: any) {
      this.spinner.hide();
      const errorMessage = err?.toString() ?? '';
      if (errorMessage.includes('tcp connect error') || errorMessage.includes('os error 10061')) {
        this.Notificaciones.Error('No se pudo conectar con el servidor');
        throw new Error('No se pudo conectar con el servidor');
      }

      if (errorMessage.includes('ECONNRESET')) {
        this.Notificaciones.Warn('Ocurrió un error de red, intenta nuevamente la acción.');
      }
      
      this.Notificaciones.Error('Ocurrió un error inesperado');
      throw err;
    }
  }

  private handleHttpError(status: number) {
    switch (status) {
      case 401:
        this.Notificaciones.Warn('Sesión inválida o expirada. Volvé a iniciar sesión.');
        localStorage.removeItem('sesion');
        this.router.navigateByUrl('ingresar');
        break;
      case 400:
        this.Notificaciones.Error('Solicitud incorrecta (400)');
        break;
      case 404:
        this.Notificaciones.Error('No se encontró el recurso solicitado (404)');
        break;
      case 500:
        this.Notificaciones.Error('Ocurrió un error interno en el servidor (500)');
        break;
      default:
        this.Notificaciones.Error(`Error desconocido (${status})`);
        break;
    }
  }


}
