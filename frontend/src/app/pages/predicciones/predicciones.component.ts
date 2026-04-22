// src/app/pages/predicciones/predicciones.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../services/auth.service';

interface QuincenaPredicha {
    quincena: string;
    mes: string;
    anio: number;
    costoMillones: number;
    costoCOP: number;
    crecimiento: number;
}

@Component({
    selector: 'app-predicciones',
    standalone: true,
    imports: [CommonModule, RouterModule, SidebarComponent, HttpClientModule, FormsModule],
    templateUrl: './predicciones.component.html',
    styleUrls: ['./predicciones.component.scss']
})
export class PrediccionesComponent implements OnInit {

    // Variables del formulario
    mesesRestantes: string[] = ['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    mesSeleccionado: string = 'Mayo';
    quincenaSeleccionada: string = '1ra';
    tasaCrecimiento: number = 2.0; // % por quincena

    // Resultados
    prediccionActual: QuincenaPredicha | null = null;
    predicciones: QuincenaPredicha[] = [];
    loading: boolean = false;
    error: string | null = null;

    // Costo base real (última quincena cerrada)
    costoBaseQuincena: number = 12294.24; // millones COP
    ultimaQuincenaReal: string = '2da Quincena Abril 2026';

    private apiUrl = 'http://localhost:8080/api/prediccion';

    constructor(
        private authService: AuthService,
        private http: HttpClient
    ) { }

    ngOnInit(): void {
        if (!this.authService.isLoggedIn()) {
            this.authService.logout();
            return;
        }
        this.cargarCostoBase();
    }

    cargarCostoBase() {
        const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        // Obtener el costo real de la última quincena desde MongoDB
        this.http.get<any>(`${this.apiUrl}/ultima-quincena`, { headers })
            .subscribe({
                next: (response) => {
                    if (response && response.costoMillones) {
                        this.costoBaseQuincena = response.costoMillones;
                        this.ultimaQuincenaReal = response.description;
                    }
                    console.log(`💰 Costo base: ${this.costoBaseQuincena} millones (${this.ultimaQuincenaReal})`);
                },
                error: (err) => {
                    console.error('Error al cargar costo base:', err);
                    // Usar valor por defecto
                    this.costoBaseQuincena = 12294.24;
                }
            });
    }

    predecir() {
        this.loading = true;
        this.error = null;

        // Calcular cuántas quincenas han pasado desde abril 2026
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mesIndex = meses.indexOf(this.mesSeleccionado);
        const mesAbrilIndex = meses.indexOf('Abril');

        // Calcular número de quincenas de diferencia
        let quincenasDiferencia = (mesIndex - mesAbrilIndex) * 2;
        if (this.quincenaSeleccionada === '1ra') {
            quincenasDiferencia += 1;
        } else {
            quincenasDiferencia += 2;
        }

        // Aplicar crecimiento compuesto
        let costoPredicho = this.costoBaseQuincena;
        for (let i = 0; i < quincenasDiferencia; i++) {
            costoPredicho = costoPredicho * (1 + this.tasaCrecimiento / 100);
        }

        // Calcular crecimiento respecto a la base
        const crecimiento = ((costoPredicho - this.costoBaseQuincena) / this.costoBaseQuincena) * 100;

        this.prediccionActual = {
            quincena: this.quincenaSeleccionada,
            mes: this.mesSeleccionado,
            anio: 2026,
            costoMillones: Math.round(costoPredicho * 100) / 100,
            costoCOP: Math.round(costoPredicho * 1_000_000),
            crecimiento: Math.round(crecimiento * 100) / 100
        };

        this.loading = false;
    }

    predecirTodo() {
        this.loading = true;
        this.predicciones = [];

        const meses = ['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        let costoActual = this.costoBaseQuincena;
        let quincenaNum = 1;

        for (const mes of meses) {
            // 1ra Quincena
            let costo1ra = costoActual * (1 + this.tasaCrecimiento / 100);
            let crecimiento1ra = ((costo1ra - this.costoBaseQuincena) / this.costoBaseQuincena) * 100;
            this.predicciones.push({
                quincena: '1ra',
                mes: mes,
                anio: 2026,
                costoMillones: Math.round(costo1ra * 100) / 100,
                costoCOP: Math.round(costo1ra * 1_000_000),
                crecimiento: Math.round(crecimiento1ra * 100) / 100
            });

            // 2da Quincena
            let costo2da = costo1ra * (1 + this.tasaCrecimiento / 100);
            let crecimiento2da = ((costo2da - this.costoBaseQuincena) / this.costoBaseQuincena) * 100;
            this.predicciones.push({
                quincena: '2da',
                mes: mes,
                anio: 2026,
                costoMillones: Math.round(costo2da * 100) / 100,
                costoCOP: Math.round(costo2da * 1_000_000),
                crecimiento: Math.round(crecimiento2da * 100) / 100
            });

            costoActual = costo2da;
            quincenaNum += 2;
        }

        this.loading = false;
    }

    formatearCOP(valor: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(valor);
    }

    getTotalMensual(mes: string): number {
        const quincenasMes = this.predicciones.filter(q => q.mes === mes);
        if (quincenasMes.length === 2) {
            return quincenasMes[0].costoCOP + quincenasMes[1].costoCOP;
        }
        return 0;
    }

    getTotalGeneral(): number {
        return this.predicciones.reduce((sum, q) => sum + q.costoCOP, 0);
    }
    getQuincenaPorMes(mes: string, quincena: string): QuincenaPredicha | undefined {
        return this.predicciones.find(q => q.mes === mes && q.quincena === quincena);
    }

    cerrarSesion() {
        this.authService.logout();
    }
}