// src/app/models/contrato.model.ts
export interface Contrato {
    id?: string;
    idEmpleado: number ;
    idTipoContrato: string;
    fechaInicio: Date;
    fechaFin: Date;
    estado: string; // VIGENTE, TERMINADO
    fechaCreacion?: Date;
    fechaActualizacion?: Date;
}

export interface ContratoCompleto extends Contrato {
    empleado?: {
        nombre: string;
        apellido: string;
        documento: string;
        cargo: string;
        salarioBase: number;
        telefono?: string;
        fechaIngreso?: Date;
    };
}
