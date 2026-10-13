// Duplicados en el idNomina más grande (6a9733e5febb2d08e14061aa = 1ra Quincena Sep 2026)
var NOM = "6a9733e5febb2d08e14061aa";
print("=== DUPLICADOS POR idEmpleado EN " + NOM + " ===");
var dups = db.pago_nomina.aggregate([
  { $match: { idNomina: NOM } },
  { $group: { _id: "$idEmpleado", n: { $sum: 1 }, suma: { $sum: "$totalPagar" } } },
  { $match: { n: { $gt: 1 } } },
  { $sort: { n: -1 } }, { $limit: 10 }
]).toArray();
print("EMPLEADOS_CON_DUPLICADOS=" + dups.length);
dups.forEach(function (d) {
  print("idEmpleado=" + d._id + " pagos=" + d.n + " suma=" + Math.round(d.suma));
});
// Total duplicado (pago extra por cada empleado con n>1)
var exceso = 0;
dups.forEach(function (d) { exceso += d.suma; });
print("SUMA_TODOS_DUPLICADOS=" + Math.round(exceso));

// Muestra de un duplicado concreto
var sample = dups[0];
if (sample) {
  db.pago_nomina.find({ idNomina: NOM, idEmpleado: sample._id }).forEach(function (x) {
    print("EJEMPLO: _id=" + x._id + " fecha=" + x.fechaPago + " total=" + x.totalPagar + " estado=" + x.estado + " nombre=" + x.nombreEmpleado);
  });
}
