export interface Empleado {
  id: number;
  numeroDocumento: string;
  nombre: string;
  apellido: string;
  cargo: string;
  salarioBase: number;
  estado?: string;
}