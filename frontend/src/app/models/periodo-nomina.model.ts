export interface PeriodoNomina {
  id: string;
  quincena: number;
  anio: number;
  estado: 'ABIERTO' | 'PAGADO';
  nombre: string;
  periodoKey: string;
}