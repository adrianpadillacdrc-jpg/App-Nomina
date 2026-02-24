// ===================================
// 🔐 CONTROL DE ACCESO Y LOGIN
// ===================================
window.addEventListener('load', () => {
  console.log('✅ Script cargado correctamente');

  const paginaActual = window.location.pathname.split('/').pop();
  const rolActivo = localStorage.getItem('rolActivo');

  // Si no hay sesión y no estamos en login
  if (!rolActivo && paginaActual !== 'login.html') {
    window.location.href = 'login.html';
    return;
  }

  // Proteger dashboard admin
  if (paginaActual === 'dashboard-admin.html' && rolActivo !== 'administrador') {
    window.location.href = 'login.html';
    return;
  }

  // Proteger consulta
  if (paginaActual === 'consulta.html' && rolActivo !== 'empleado' && rolActivo !== 'administrador') {
    window.location.href = 'login.html';
    return;
  }

  // Si estamos en consulta.html, construir vista dinámica
  if (paginaActual === 'consulta.html') inicializarConsulta();
});

// ===================================
// 🔑 FUNCIÓN LOGIN
// ===================================
function login() {
  const usuario = document.getElementById('usuario')?.value.trim().toLowerCase();
  const contrasena = document.getElementById('contrasena')?.value.trim();

  if (!usuario || !contrasena) {
    alert('Por favor completa todos los campos');
    return;
  }

  if (usuario === 'admin' && contrasena === 'numa2025') {
    localStorage.setItem('rolActivo', 'administrador');
    localStorage.setItem('usuarioActivo', usuario);
    window.location.href = 'dashboard-admin.html';
  } 
  else if (usuario === 'empleado' && contrasena === 'empleado2025') {
    localStorage.setItem('rolActivo', 'empleado');
    localStorage.setItem('usuarioActivo', usuario);
    window.location.href = 'consulta.html';
  } 
  else {
    alert('❌ Credenciales incorrectas.\n\nAdmin: admin / admin123\nEmpleado: empleado / empleado123');
  }
}

// ===================================
// 👥 DATOS DE EJEMPLO
// ===================================
const empleados = [
  { documento:'100000001', nombre:'Dianne Russell', cargo:'Administrativo', salario:2200000, estado:'Activo', liquidado:true },
  { documento:'100000002', nombre:'Bessie Cooper', cargo:'Ejecutivo', salario:3500000, estado:'Activo', liquidado:true },
  { documento:'100000003', nombre:'Marvin McKinney', cargo:'Administrativo', salario:2100000, estado:'Activo', liquidado:false },
  { documento:'100000004', nombre:'Esther Howard', cargo:'Analista', salario:2500000, estado:'Activo', liquidado:false },
  { documento:'100000005', nombre:'Annette Black', cargo:'Auxiliar', salario:1800000, estado:'Activo', liquidado:true }
];

// ===================================
// 📊 TABLA PRINCIPAL
// ===================================
function cargarTabla() {
  const tbody = document.querySelector('#tablaEmpleados tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  empleados.forEach((emp, i) => {
    const estado = emp.liquidado ? 'Inactivo' : emp.estado;
    const disabled = emp.liquidado ? 'disabled' : '';
    tbody.innerHTML += `
      <tr>
        <td>${emp.documento}</td>
        <td>${emp.nombre}</td>
        <td>${emp.cargo}</td>
        <td>$${emp.salario.toLocaleString()}</td>
        <td><span class="status ${estado.toLowerCase()}">${estado}</span></td>
        <td><span class="status ${emp.liquidado ? 'liquidado' : 'pendiente'}">${emp.liquidado ? 'Sí' : 'No'}</span></td>
        <td>
          <button class="btn-secondary" onclick="verDetalle(${i})">Ver</button>
          <button class="btn-action" onclick="liquidarEmpleado(${i})" ${disabled}>Liquidar</button>
        </td>
      </tr>`;
  });
}

// ===================================
// 🔍 UTILIDADES
// ===================================
function filtrarTabla() {
  const valor = document.getElementById('searchBox')?.value.toLowerCase() || '';
  document.querySelectorAll('#tablaEmpleados tbody tr').forEach(fila => {
    fila.style.display = fila.textContent.toLowerCase().includes(valor) ? '' : 'none';
  });
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
}

function cerrarSesion() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.clear();
    location.href = 'login.html';
  }
}

function mostrarMensaje(texto, tipo) {
  const div = document.getElementById('mensaje');
  if (!div) return;
  div.textContent = texto;
  div.className = `mensaje-flotante mostrar ${tipo}`;
  setTimeout(() => div.classList.remove('mostrar'), 2500);
}

// ===================================
// 💼 LIQUIDACIÓN Y DETALLES
// ===================================
function liquidarEmpleado(index) {
  const emp = empleados[index];
  if (emp.liquidado) return mostrarMensaje('Empleado ya liquidado', 'error');
  if (!confirm(`¿Confirmas liquidar a ${emp.nombre}?`)) return;

  emp.estado = 'Inactivo';
  emp.liquidado = true;
  emp.fechaLiquidacion = new Date().toLocaleDateString();

  cargarTabla();
  mostrarMensaje(`✅ ${emp.nombre} liquidado`, 'exito');
}

function verDetalle(index) {
  const emp = empleados[index];
  const modalBody = document.getElementById('modalDetalleBody');
  if (!modalBody) return;

  modalBody.innerHTML = `
    <h2>Detalle - ${emp.nombre}</h2>
    <p><strong>Documento:</strong> ${emp.documento}</p>
    <p><strong>Cargo:</strong> ${emp.cargo}</p>
    <p><strong>Salario:</strong> $${emp.salario.toLocaleString()}</p>
    <p><strong>Estado:</strong> ${emp.estado}</p>
    <p><strong>Liquidado:</strong> ${emp.liquidado ? 'Sí' : 'No'}</p>
    <p><strong>Fecha:</strong> ${emp.fechaLiquidacion || 'No liquidado'}</p>
    <div style="margin-top:12px">
      ${!emp.liquidado ? `<button class="btn-action" onclick="liquidarEmpleado(${index}); cerrarModalDetalle();">Liquidar ahora</button>` : ''}
      <button class="btn-secondary" onclick="cerrarModalDetalle()">Cerrar</button>
    </div>`;
  
  document.getElementById('modalDetalle')?.classList.remove('hidden');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle')?.classList.add('hidden');
}

// ===================================
// 🔍 CONSULTA.HTML — Vista Dinámica
// ===================================
function inicializarConsulta() {
  const rol = localStorage.getItem('rolActivo');
  const thead = document.getElementById('theadConsulta');
  const tbody = document.getElementById('tbodyConsulta');
  const menu = document.getElementById('menuConsulta');
  if (!thead || !tbody || !menu) return;

  // Menú según rol
  if (rol === 'administrador') {
    menu.innerHTML = `
      <a href="dashboard-admin.html"><i class="fa-solid fa-house"></i><span>Inicio</span></a>
      <a href="registro-empleados.html"><i class="fa-solid fa-user-plus"></i><span>Registrar</span></a>
      <a href="liquidacion-nomina.html"><i class="fa-solid fa-file-invoice-dollar"></i><span>Liquidar</span></a>
      <a href="consulta.html" class="active"><i class="fa-solid fa-magnifying-glass"></i><span>Consultar</span></a>
      <a href="#" onclick="cerrarSesion()"><i class="fa-solid fa-right-from-bracket"></i><span>Salir</span></a>`;

    thead.innerHTML = `
      <tr><th>Documento</th><th>Nombre</th><th>Cargo</th><th>Salario</th><th>Estado</th><th>Acciones</th></tr>`;

    tbody.innerHTML = empleados.map((emp, i) => `
      <tr>
        <td>${emp.documento}</td><td>${emp.nombre}</td><td>${emp.cargo}</td>
        <td>$${emp.salario.toLocaleString()}</td><td>${emp.estado}</td>
        <td><button class="btn-primary" onclick="verDetalle(${i})">Ver</button></td>
      </tr>`).join('');
  }

  else if (rol === 'empleado') {
    menu.innerHTML = `
      <a href="dashboard-empleado.html"><i class="fa-solid fa-house"></i><span>Inicio</span></a>
      <a href="consulta.html" class="active"><i class="fa-solid fa-magnifying-glass"></i><span>Consultar</span></a>
      <a href="#" onclick="cerrarSesion()"><i class="fa-solid fa-right-from-bracket"></i><span>Salir</span></a>`;

    thead.innerHTML = `<tr><th>Nombre</th><th>Cargo</th><th>Acciones</th></tr>`;

    tbody.innerHTML = empleados.map(emp => `
      <tr>
        <td>${emp.nombre}</td><td>${emp.cargo}</td>
        <td><button class="btn-primary" onclick="verNominaEmpleado('${emp.documento}','${emp.nombre}','${emp.cargo}',${emp.salario},'${emp.estado}',${emp.liquidado})">Ver Nómina</button></td>
      </tr>`).join('');
  }
}

// ===================================
// 📄 VER NÓMINA (con validación)
// ===================================
function verNominaEmpleado(documento, nombre, cargo, salario, estado, liquidado) {
  const clave = prompt('🔐 Ingresa tu cédula para ver tu nómina:');
  if (clave === documento) {
    alert(
      `📄 Nómina de ${nombre}\n\n` +
      `Cargo: ${cargo}\n` +
      `Salario: $${salario.toLocaleString()}\n` +
      `Estado: ${estado}\n` +
      `Liquidado: ${liquidado ? 'Sí' : 'No'}`
    );
  } else {
    alert('❌ Cédula incorrecta. No puedes ver esta nómina.');
  }
}

// ===================================
// 🔍 FILTRO GENERAL DE CONSULTA
// ===================================
function filtrarTablaConsulta() {
  const valor = document.getElementById('searchBox')?.value.toLowerCase() || '';
  document.querySelectorAll('#tablaConsulta tbody tr').forEach(fila => {
    fila.style.display = fila.textContent.toLowerCase().includes(valor) ? '' : 'none';
  });
}


function liquidar(id) {
  if (confirm('¿Liquidar nómina de este empleado?')) {
    fetch(`/api/nominas/liquidar/${id}`, { method: 'POST' })
      .then(r => r.text())
      .then(msg => {
        alert(msg);
        cargarDashboard();
      })
      .catch(() => alert('Error'));
  }
}