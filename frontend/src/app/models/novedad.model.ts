export interface Novedad {
  id?: string;
  empleadoId: number;
  tipo: 'DEVENGO' | 'DEDUCCION';
  descripcion: string;
  valor: number;
  fecha?: string;
  periodo: string;
}