// backend/index.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 8080;

// Configuración de PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'numa_nomina',
  password: process.env.DB_PASS || 'tu_password',
  port: 5432,
});

app.use(cors());
app.use(express.json());

// GET: Todos los empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, tipoDocumento, numeroDocumento, nombre, apellido, edad, genero, direccion, correo,
        cargo, tipoContrato, fechaInicioContrato, fechaFinContrato, salarioBase, estado,
        empresa, correoEmpresarial, idEmpresa
      FROM empleados 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error GET /api/empleados:', err);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// POST: Registrar nuevo empleado
app.post('/api/empleados', async (req, res) => {
  try {
    const {
      tipoDocumento, numeroDocumento, nombre, apellido, edad, genero, direccion, correo,
      cargo, tipoContrato, fechaInicioContrato, fechaFinContrato, salarioBase, estado,
      empresa, correoEmpresarial, idEmpresa
    } = req.body;

    const query = `
      INSERT INTO empleados (
        tipoDocumento, numeroDocumento, nombre, apellido, edad, genero, direccion, correo,
        cargo, tipoContrato, fechaInicioContrato, fechaFinContrato, salarioBase, estado,
        empresa, correoEmpresarial, idEmpresa
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `;

    const values = [
      tipoDocumento, numeroDocumento, nombre, apellido, edad || null, genero, direccion, correo,
      cargo, tipoContrato, fechaInicioContrato, fechaFinContrato || null, salarioBase, estado,
      empresa, correoEmpresarial, idEmpresa || 1
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error POST /api/empleados:', err);
    res.status(500).json({ error: 'Error al registrar empleado', details: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`BACKEND NUMA NÓMINA CORRIENDO EN http://localhost:${PORT}`);
  console.log(`CARTAGENA - 11 NOV 2025 - 11:20 AM`);
});