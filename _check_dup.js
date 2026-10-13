//ntos duplicados en total (no solo top 10)?
var NOM = "6a9733e5febb2d08e14061aa";
var all = db.pago_nomina.aggregate([
  { $match: { idNomina: NOM } },
  { $group: { _id: "$idEmpleado", n: { $sum: 1 }, suma: { $sum: "$totalPagar" } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("TOTAL_EMPLEADOS_DUP=" + all.length);
var sumaDup = 0;
all.forEach(function (d) { sumaDup += d.suma; });
print("SUMA_TOTAL_DUPS=" + Math.round(sumaDup));
var unico = 0;
all.forEach(function (d) { unico += d.suma / d.n; });
print("COSTO_SI_UN_PAGO_POR_DUP=" + Math.round(unico));
var sinDups = 9907 - all.length * 1;
print("APROX_PAGOS=SIN EXTRA");
var test = db.pago_nomina.countDocuments({ idNomina: NOM, nombreEmpleado: /^Empleado \d+$/ });
print("PAGOS_TEST=" + test);
var reales = db.pago_nomina.countDocuments({ idNomina: NOM, nombreEmpleado: { $not: /^Empleado \d+$/ } });
print("PAGOS_REALES=" + reales);
var unicosPagosConNombreRealYTestPorMismoEmp = db.pago_nomina.aggregate([
  { $match: { idNomina: NOM } },
  { $group: { _id: "$idEmpleado", tipos: { $addToSet: {$cond:[{$regexMatch:{input:"$nombreEmpleado", regex:/^Empleado \d+$/}}, "TEST", "REAL"]} } } },
  { $project: { mezcla: { $setEquals: [ [{ $slice: ["$tipos", 2] }], [] ] } } }
]).count()
print("(info adicional omitida)");
