// ==========================================
// CONFIGURACIÓN CENTRAL DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://lgejowajaxmmqdxwrsjc.supabase.co";
// Recuerda usar el icono de los dos cuadritos en Supabase para obtener tu clave real sin las "xx"
const SUPABASE_ANON_KEY = "sb_publishable_13IRWRbW23xxWdVXeK8YOQ_A-SkI7oJ";

// Inicialización inmune a errores de re-declaración en el navegador
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const asistenciaDB = window.supabaseClient;

// --- BASE DE DATOS LOCAL DE USUARIOS (SISTEMA DE ACCESO) ---
const usuariosPorDefecto = [
    { nombreCompleto: "Administrador Sistema", primerNombre: "admin", codigo: "12345", rol: "admin", fechaRegistro: "20/05/2026" },
    { nombreCompleto: "Reynaldo Antonio Matamoros Centeno", primerNombre: "reynaldo", codigo: "54321", rol: "admin", fechaRegistro: "20/05/2026" },
    { nombreCompleto: "Juan Pérez", primerNombre: "juan", codigo: "10023", rol: "empleado", fechaRegistro: "24/05/2026" }
];

let baseUsuarios = JSON.parse(localStorage.getItem('usuarios_asistencia')) || usuariosPorDefecto;
if (!localStorage.getItem('usuarios_asistencia')) {
    localStorage.setItem('usuarios_asistencia', JSON.stringify(baseUsuarios));
}

let usuarioLogueado = null;

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const loginName = document.getElementById('login-name');
const loginCode = document.getElementById('login-code');
const btnLogin = document.getElementById('btn-login');
const loginStatus = document.getElementById('login-status');

const sidebar = document.getElementById('sidebar');
const welcomeBanner = document.getElementById('welcome-banner');
const txtUsername = document.getElementById('username');
const statusMessage = document.getElementById('status-message');

const btnEntrada = document.getElementById('btn-entrada');
const btnInicioLibre = document.getElementById('btn-inicio-libre');
const btnFinLibre = document.getElementById('btn-fin-libre');
const btnSalida = document.getElementById('btn-salida');
const btnExcel = document.getElementById('btn-excel');
const btnLogout = document.getElementById('btn-logout');

const newFullName = document.getElementById('new-user-fullname');
const btnAddUser = document.getElementById('btn-add-user');
const userListDiv = document.getElementById('user-list');

const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');

// --- SISTEMA LOGIN ---
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const nombreIngresado = loginName.value.trim().toLowerCase();
        const codigoIngresado = loginCode.value.trim();

        if (!nombreIngresado || !codigoIngresado) {
            loginStatus.innerText = "⚠️ Rellene ambos campos.";
            loginStatus.style.color = "red";
            return;
        }

        const usuarioEncontrado = baseUsuarios.find(u => u.primerNombre.toLowerCase() === nombreIngresado && u.codigo === codigoIngresado);

        if (usuarioEncontrado) {
            usuarioLogueado = usuarioEncontrado;
            if (loginScreen) loginScreen.style.display = 'none';
            inicializarApp();
        } else {
            loginStatus.innerText = "❌ Nombre o código incorrectos.";
            loginStatus.style.color = "red";
        }
    });
}

function inicializarApp() {
    if (txtUsername && usuarioLogueado) txtUsername.value = usuarioLogueado.nombreCompleto;
    establecerSaludo();

    if (usuarioLogueado && (usuarioLogueado.rol === 'admin' || usuarioLogueado.role === 'admin')) {
        if (sidebar) sidebar.classList.remove('hidden');
        actualizarListaUsuariosAdmin();
    } else {
        if (sidebar) sidebar.classList.add('hidden');
    }
    if (statusMessage) statusMessage.innerText = "";
}

function establecerSaludo() {
    if (!welcomeBanner || !usuarioLogueado) return;
    const hora = new Date().getHours();
    let saludo = "¡Hola!";
    if (hora >= 6 && hora < 12) saludo = "🌅 Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "☀️ Buenas tardes";
    else saludo = "🌙 Buenas noches";

    welcomeBanner.innerText = `${saludo}, ${usuarioLogueado.nombreCompleto}`;
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        usuarioLogueado = null;
        if (loginName) loginName.value = "";
        if (loginCode) loginCode.value = "";
        if (loginStatus) loginStatus.innerText = "";
        if (loginScreen) loginScreen.style.display = 'flex';
        
        document.querySelectorAll('.collapsible').forEach(b => {
            b.classList.remove('active');
            if (b.nextElementSibling) b.nextElementSibling.style.maxHeight = null;
        });
    });
}

// --- ACCIONES DE ASISTENCIA CENTRALIZADAS EN LA NUBE ---
if (btnEntrada) btnEntrada.addEventListener('click', () => procesarMarcado('Entrada'));
if (btnInicioLibre) btnInicioLibre.addEventListener('click', () => procesarMarcado('Inicio Libre'));
if (btnFinLibre) btnFinLibre.addEventListener('click', () => procesarMarcado('Fin Libre'));
if (btnSalida) btnSalida.addEventListener('click', () => procesarMarcado('Salida'));
if (btnExcel) btnExcel.addEventListener('click', descargarExcelNativo);

async function procesarMarcado(accion) {
    const nombre = txtUsername ? txtUsername.value.trim() : '';
    if (!nombre) {
        mostrarMensaje('⚠️ No se ha identificado un usuario válido.', 'red');
        return;
    }
    if (!navigator.geolocation) {
        mostrarMensaje('❌ Tu navegador no soporta la geolocalización.', 'red');
        return;
    }

    mostrarMensaje('🔄 Obteniendo ubicación GPS y conectando al servidor...', 'orange');
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitud = position.coords.latitude.toString();
            const longitud = position.coords.longitude.toString();
            const ahora = new Date();
            const fechaHoy = ahora.toLocaleDateString(); 
            const horaActual = ahora.toLocaleTimeString();
            const urlMapa = `https://maps.google.com/?q=${latitud},${longitud}`;

            try {
                // Modificado para usar asistenciaDB
                const { data: filas, error: fetchError } = await asistenciaDB
                    .from('fichajes')
                    .select('*')
                    .eq('nombre', nombre)
                    .eq('fecha', fechaHoy);

                if (fetchError) throw fetchError;

                let registroExistente = filas && filas.length > 0 ? filas[0] : null;

                if (accion === 'Entrada') {
                    if (registroExistente) {
                        mostrarMensaje('⚠️ Ya registraste una entrada en el servidor central hoy.', 'orange');
                        return;
                    }
                    
                    // Modificado para usar asistenciaDB
                    const { error: insertError } = await asistenciaDB
                        .from('fichajes')
                        .insert([{
                            nombre: nombre,
                            fecha: fechaHoy,
                            hora_entrada: horaActual,
                            inicio_libre: '---',
                            fin_libre: '---',
                            hora_salida: '---',
                            latitud: latitud,
                            longitud: longitud,
                            mapa: urlMapa
                        }]);

                    if (insertError) throw insertError;
                    mostrarMensaje(`✅ Entrada registrada en la NUBE con éxito (${horaActual}).`, 'green');

                } else {
                    if (!registroExistente) {
                        mostrarMensaje('❌ No puedes marcar esto sin antes haber registrado una Entrada hoy.', 'red');
                        return;
                    }

                    let datosActualizados = {};

                    if (accion === 'Inicio Libre') {
                        datosActualizados.inicio_libre = horaActual;
                    } else if (accion === 'Fin Libre') {
                        datosActualizados.fin_libre = horaActual;
                    } else if (accion === 'Salida') {
                        if (registroExistente.hora_salida !== '---') {
                            mostrarMensaje('⚠️ Ya habías registrado tu salida en el servidor hoy.', 'orange');
                            return;
                        }
                        datosActualizados.hora_salida = horaActual;
                    }

                    // Modificado para usar asistenciaDB
                    const { error: updateError } = await asistenciaDB
                        .from('fichajes')
                        .update(datosActualizados)
                        .eq('id', registroExistente.id);

                    if (updateError) throw updateError;
                    mostrarMensaje(`✅ Ajuste [${accion}] sincronizado en la nube a las ${horaActual}.`, 'green');
                }

            } catch (err) {
                console.error(err);
                mostrarMensaje('❌ Error de conexión con la nube. Intente de nuevo.', 'red');
            }
        },
        (error) => {
            mostrarMensaje('❌ Error de GPS: Debes permitir el acceso a la ubicación.', 'red');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function mostrarMensaje(texto, color) {
    if (statusMessage) {
        statusMessage.innerText = texto;
        statusMessage.style.color = color;
    }
}

// --- PANEL CONTROL USUARIOS ---
if (btnAddUser) {
    btnAddUser.addEventListener('click', () => {
        const nombreCompleto = newFullName ? newFullName.value.trim() : '';
        if (!nombreCompleto) {
            alert("Por favor ingrese el nombre y apellido.");
            return;
        }

        const primerNombre = nombreCompleto.split(" ")[0].toLowerCase();
        
        let nuevoCodigo;
        let codigoDuplicado = true;
        while (codigoDuplicado) {
            nuevoCodigo = Math.floor(10000 + Math.random() * 90000).toString();
            codigoDuplicado = baseUsuarios.some(u => u.codigo === nuevoCodigo);
        }

        const fechaActualStr = new Date().toLocaleDateString();

        const nuevoUsuario = {
            nombreCompleto: nombreCompleto,
            primerNombre: primerNombre,
            codigo: nuevoCodigo,
            rol: "empleado",
            fechaRegistro: fechaActualStr
        };

        baseUsuarios.push(nuevoUsuario);
        localStorage.setItem('usuarios_asistencia', JSON.stringify(baseUsuarios));
        if (newFullName) newFullName.value = "";
        
        actualizarListaUsuariosAdmin();
        
        if (userListDiv && userListDiv.parentElement) {
            const contentDiv = userListDiv.parentElement;
            if (contentDiv.style.maxHeight) {
                contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
            }
        }

        alert(`Usuario Registrado:\nNombre: ${nombreCompleto}\nCódigo Acceso: ${nuevoCodigo}\n(Inicia sesión con "${primerNombre}")`);
    });
}

function actualizarListaUsuariosAdmin() {
    if (!userListDiv) return;
    userListDiv.innerHTML = "";
    baseUsuarios.forEach(u => {
        const item = document.createElement('div');
        item.className = 'user-item';
        const fRegistro = u.fechaRegistro || "Antes del 25/05/2026";
        
        item.innerHTML = `
            <div class="user-info">
                <span>${u.nombreCompleto} (<b>${u.primerNombre}</b>)</span>
                <span style="color: #aaa; font-size: 11px;">Código: <b>${u.codigo}</b></span>
                <span style="color: #5dade2; font-size: 11px; font-weight: bold;">📅 Reg: ${fRegistro}</span>
            </div>
            <button class="btn-delete" onclick="eliminarUsuario('${u.codigo}')">🗑️ Borrar</button>
        `;
        userListDiv.appendChild(item);
    });
}

window.eliminarUsuario = function(codigo) {
    const usuario = baseUsuarios.find(u => u.codigo === codigo);
    if (!usuario) return;

    if (usuarioLogueado && usuarioLogueado.codigo === codigo) {
        alert("❌ No puedes eliminar tu propio usuario de administrador mientras tienes la sesión iniciada.");
        return;
    }

    const confirmar = confirm(`⚠ ¿Estás seguro de que deseas eliminar permanentemente a "${usuario.nombreCompleto}"?`);
    
    if (confirmar) {
        baseUsuarios = baseUsuarios.filter(u => u.codigo !== codigo);
        localStorage.setItem('usuarios_asistencia', JSON.stringify(baseUsuarios));
        actualizarListaUsuariosAdmin();
        
        if (userListDiv && userListDiv.parentElement) {
            const contentDiv = userListDiv.parentElement;
            if (contentDiv.style.maxHeight) {
                contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
            }
        }
    }
};

// --- REPORTE DE EXCEL CENTRALIZADO ---
async function descargarExcelNativo() {
    mostrarMensaje('🔄 Solicitando registros históricos al servidor central...', 'orange');

    // Modificado para usar asistenciaDB
    const { data: todosLosRegistros, error: queryError } = await asistenciaDB
        .from('fichajes')
        .select('*');

    if (queryError || !todosLosRegistros || todosLosRegistros.length === 0) {
        mostrarMensaje('⚠️ No se encontraron registros consolidados en el servidor.', 'orange');
        return;
    }

    const fechaInicioStr = filterStartDate ? filterStartDate.value : ''; 
    const fechaFinStr = filterEndDate ? filterEndDate.value : '';     

    let dateInicio = null;
    let dateFin = null;

    if (fechaInicioStr) {
        const p = fechaInicioStr.split('-');
        dateInicio = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 0, 0, 0);
    }
    if (fechaFinStr) {
        const p = fechaFinStr.split('-');
        dateFin = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), 23, 59, 59);
    }

    const registrosFiltrados = todosLosRegistros.filter(r => {
        if (!r.fecha) return false;
        const partes = r.fecha.split('/'); 
        if (partes.length !== 3) return true;

        const diaReg = parseInt(partes[0], 10);
        const mesReg = parseInt(partes[1], 10) - 1;
        const anioReg = parseInt(partes[2], 10);
        
        const fechaRegistro = new Date(anioReg, mesReg, diaReg, 12, 0, 0);

        if (dateInicio && fechaRegistro < dateInicio) return false;
        if (dateFin && fechaRegistro > dateFin) return false;
        
        return true;
    });

    if (registrosFiltrados.length === 0) {
        mostrarMensaje('⏳ No se encontraron marcajes en el rango de fechas seleccionado.', 'red');
        return;
    }

    let filasCSV = [];
    filasCSV.push("Nombre;Fecha;Hora Entrada;Inicio Tiempo Libre;Fin Tiempo Libre;Hora Salida;Latitud;Longitud;Enlace Mapa");

    registrosFiltrados.forEach(r => {
        const nombre = r.nombre || '---';
        const fecha = r.fecha || '---';
        const entrada = r.hora_entrada || '---';
        const iniLibre = r.inicio_libre || '---';
        const finLibre = r.fin_libre || '---';
        const salida = r.hora_salida || '---';
        
        const cellLat = r.latitud ? `="${r.latitud}"` : '"---"';
        const cellLon = r.longitud ? `="${r.longitud}"` : '"---"';
        const cellMap = r.mapa ? `="${r.mapa}"` : '"---"';

        filasCSV.push(`${nombre};${fecha};${entrada};${iniLibre};${finLibre};${salida};${cellLat};${cellLon};${cellMap}`);
    });

    let textoFinal = filasCSV.join("\r\n");
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([BOM, textoFinal], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    const sufijoFecha = (fechaInicioStr ? `_desde_${fechaInicioStr}` : '') + (fechaFinStr ? `_hasta_${fechaFinStr}` : '');
    link.setAttribute("download", `Reporte_General_Asistencia${sufijoFecha}.csv`);
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarMensaje('📊 ¡Reporte General Unificado descargado con éxito!', 'green');
}

// --- MANEJADOR DE MENÚS COLAPSABLES ---
document.addEventListener("DOMContentLoaded", () => {
    const colapsables = document.querySelectorAll(".collapsible");
    colapsables.forEach(boton => {
        boton.addEventListener("click", function() {
            this.classList.toggle("active");
            const contenido = this.nextElementSibling;
            if (contenido) {
                if (contenido.style.maxHeight) {
                    contenido.style.maxHeight = null;
                } else {
                    contenido.style.maxHeight = contenido.scrollHeight + "px";
                }
            }
        });
    });
});
