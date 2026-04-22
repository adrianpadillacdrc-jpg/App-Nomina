// Inicializar base de datos de nómina
db = db.getSiblingDB('numa_mongo');

// Crear usuario de aplicación
try {
    db.createUser({
        user: 'numa_user',
        pwd: 'numa2025',
        roles: [{ role: 'readWrite', db: 'numa_mongo' }]
    });
} catch(e) {
    print("Usuario ya existe o error: " + e);
}

// Crear colecciones
const collections = ['periodos', 'pagos', 'novedades', 'liquidaciones', 'contratos', 'reportes'];
collections.forEach(col => {
    if (!db.getCollectionNames().includes(col)) {
        db.createCollection(col);
        print("Colección creada: " + col);
    }
});

// Crear índices
db.periodos.createIndex({ "fechaInicio": -1, "fechaFin": -1 });
db.pagos.createIndex({ "empleadoId": 1, "periodoId": 1 });
db.novedades.createIndex({ "empleadoId": 1, "fecha": -1 });
db.liquidaciones.createIndex({ "empleadoId": 1, "fechaLiquidacion": -1 });

print("MongoDB inicializado correctamente");