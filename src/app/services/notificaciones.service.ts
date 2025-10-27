import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {

    constructor(private messageService: MessageService) {}

    Success(mensaje:string) {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: mensaje });
    }

    Info(mensaje:string) {
        this.messageService.add({ severity: 'info', summary: 'Info', detail: mensaje });
    }

    Warn(mensaje:string) {
        this.messageService.add({ severity: 'warn', summary: 'Advertencia', detail: mensaje });
    }

    Error(mensaje:string) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: mensaje });
    }

    Contrast(titulo:string, mensaje:string) {
        this.messageService.add({ severity: 'contrast', summary: titulo, detail: mensaje });
    }
}
