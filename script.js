// ==========================================
// CONFIGURACIÓN CENTRAL DE SUPABASE
// ==========================================
// Eliminamos la redeclaración conflictiva y usamos la instancia global de forma segura
const SUPABASE_URL = "https://lgejowajaxmmqdxwrsjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_13IRWRbW23xxWdVXeK8YOQ_A-SkI7oJ";

if (typeof window.asistenciaDB === 'undefined') {
    // Inicializamos usando el cliente cargado por la librería externa sin pisar variables globales
    window.asistenciaDB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const dbCentral = window.asistenciaDB;

// Administradores de respaldo por si la red falla en el primer arranque
const usuariosPorDefecto = [
    { nombre_completo: "Administrador Sistema", primer_nombre: "admin", codigo: "12345", rol: "admin", fecha_registro: "20/05/2026" },
    { nombre_completo: "Reynaldo Antonio Matamoros Centeno", primer_nombre: "reynaldo", codigo: "54321", rol: "admin", fecha_registro: "20/05/2026" }
];

let usuarioLogueado = null;
let timerReloj = null;

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const loginName = document.getElementById('login-name');
const loginCode = document.getElementById('login-code');
const btnLogin = document.getElementById('btn-login');
const loginStatus = document.getElementById('login-status');

const mainAppContainer = document.getElementById('main-app-container');
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

// --- SISTEMA LOGIN SINCRO NUBE ---
if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
        const nombreIngresado = loginName.value.trim().toLowerCase();
        const codigoIngresado = loginCode.value.trim();

        if (!nombreIngresado || !codigoIngresado) {
            loginStatus.innerText = "⚠️ Rellene ambos campos.";
            loginStatus.style.color = "red";
            return;
        }

        loginStatus.innerText = "🔍 Verificando credenciales en la nube...";
        loginStatus.style.color = "orange";

        try {
            // Buscamos al usuario directamente en la tabla 'usuarios' de Supabase
            const { data: listaUsuarios, error } = await dbCentral
                .from('usuarios')
                .select('*')
                .eq('primer_nombre', nombreIngresado)
                .eq('codigo', codigoIngresado);

            if (error) throw error;

            let usuarioEncontrado = listaUsuarios && listaUsuarios.length > 0 ? listaUsuarios[0] : null;

            // Si la tabla de la nube no encuentra al admin, verifica con los por defecto locales
            if (!usuarioEncontrado) {
                usuarioEncontrado = usuariosPorDefecto.find(u => u.primer_nombre === nombreIngresado && u.codigo === codigoIngresado);
            }

            if (usuarioEncontrado) {
                usuarioLogueado = usuarioEncontrado;
                if (loginScreen) loginScreen.style.display = 'none';
                inicializarApp();
            } else {
                loginStatus.innerText = "❌ Nombre o código incorrectos.";
                loginStatus.style.color = "red";
            }
        } catch (err) {
            console.error(err);
            loginStatus.innerText = "❌ Error de conexión con los servidores.";
            loginStatus.style.color = "red";
        }
    });
}

function inicializarApp() {
    if (txtUsername && usuarioLogueado) txtUsername.value = usuarioLogueado.nombre_completo;
    if (mainAppContainer) mainAppContainer.style.display = 'flex';
    establecerSaludo();
    iniciarRelojYClima();

    if (usuarioLogueado && usuarioLogueado.rol === 'admin') {
        if (sidebar) sidebar.classList.remove('hidden');
        actualizarListaUsuariosAdmin();
    } else {
        if (sidebar) sidebar.classList.add('hidden');
    }
    if (statusMessage) statusMessage.innerText = "";
}

// --- CLIMA Y RELOJ ---
function iniciarRelojYClima() {
    if (timerReloj) clearInterval(timerReloj);
    timerReloj = setInterval(() => {
        const ahora = new Date();
        if (document.getElementById('live-date')) {
            document.getElementById('live-date').innerText = "📅 " + ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        if (document.getElementById('live-time')) {
            document.getElementById('live-time').innerText = "⏰ " + ahora.toLocaleTimeString();
        }
    }, 1000);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const respuesta = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const datosClima = await respuesta.json();
                const temp = datosClima.current_weather.temperature;
                if (document.getElementById('live-weather')) {
                    document.getElementById('live-weather').innerText = `🌡️ Temperatura Actual: ${temp}°C`;
                }
            } catch (e) {
                if (document.getElementById('live-weather')) {
                    document.getElementById('live-weather').innerText = "🌡️ Clima indisponible";
                }
            }
        }, () => {
            if (document.getElementById('live-weather')) {
                document.getElementById('live-weather').innerText = "📍 Permita el GPS para ver el clima";
            }
        });
    }
}

function establecerSaludo() {
    if (!welcomeBanner || !usuarioLogueado) return;
    const hora = new Date().getHours();
    let saludo = "¡Hola!";
    if (hora >= 6 && hora < 12) saludo = "🌅 Buenos días";
    else if (hora >= 12 && hora < 19) saludo = "☀️ Buenas tardes";
    else saludo = "🌙 Buenas noches";

    welcomeBanner.innerText = `${saludo}, ${usuarioLogueado.nombre_completo}`;
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        usuarioLogueado = null;
        if (timerReloj) clearInterval(timerReloj);
        if (loginName) loginName.value = "";
        if (loginCode) loginCode.value = "";
        if (loginStatus) loginStatus.innerText = "";
        if (mainAppContainer) mainAppContainer.style.display = 'none';
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
                const { data: filas, error: fetchError } = await dbCentral
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
                    
                    const { error: insertError } = await dbCentral
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

                    const { error: updateError } = await dbCentral
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

// --- PANEL CONTROL USUARIOS EN LA NUBE ---
if (btnAddUser) {
    btnAddUser.addEventListener('click', async () => {
        const nombreCompleto = newFullName ? newFullName.value.trim() : '';
        if (!nombreCompleto) {
            alert("Por favor ingrese el nombre y apellido.");
            return;
        }

        try {
            // Descargamos códigos existentes para evitar colisiones
            const { data: todosLosUsuarios, error: fetchError } = await dbCentral
                .from('usuarios')
                .select('codigo');

            if (fetchError) throw fetchError;

            const primerNombre = nombreCompleto.split(" ")[0].trim().toLowerCase();
            
            let nuevoCodigo;
            let codigoDuplicado = true;
            while (codigoDuplicado) {
                nuevoCodigo = Math.floor(10000 + Math.random() * 90000).toString();
                codigoDuplicado = todosLosUsuarios.some(u => u.codigo === nuevoCodigo);
            }

            const fechaActualStr = new Date().toLocaleDateString();

            // Guardamos directamente en la tabla remota
            const { error: insertError } = await dbCentral
                .from('usuarios')
                .insert([{
                    nombre_completo: nombreCompleto,
                    primer_nombre: primerNombre,
                    codigo: nuevoCodigo,
                    rol: "empleado",
                    fecha_registro: fechaActualStr
                }]);

            if (insertError) throw insertError;

            if (newFullName) newFullName.value = "";
            
            actualizarListaUsuariosAdmin();
            
            if (userListDiv && userListDiv.parentElement) {
                const contentDiv = userListDiv.parentElement;
                if (contentDiv.style.maxHeight) {
                    contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
                }
            }

            alert(`¡Usuario guardado e indexado en la NUBE!\n\nNombre: ${nombreCompleto}\nCódigo de Acceso: ${nuevoCodigo}`);
        } catch (err) {
            console.error(err);
            alert("❌ Error de comunicación al registrar en la nube.");
        }
    });
}

async function actualizarListaUsuariosAdmin() {
    if (!userListDiv) return;
    userListDiv.innerHTML = "<div style='color: #aaa; padding: 10px;'>🔄 Sincronizando desde la nube...</div>";
    
    try {
        const { data: usuariosNube, error } = await dbCentral
            .from('usuarios')
            .select('*');

        if (error) throw error;

        userListDiv.innerHTML = "";
        
        let listaFinal = [...usuariosNube];
        usuariosPorDefecto.forEach(def => {
            if (!listaFinal.some(u => u.codigo === def.codigo)) {
                listaFinal.unshift(def);
            }
        });

        listaFinal.forEach(u => {
            const item = document.createElement('div');
            item.className = 'user-item';
            const fRegistro = u.fecha_registro || "25/05/2026";
            
            item.innerHTML = `
                <div class="user-info">
                    <span>${u.nombre_completo} (<b>${u.primer_nombre}</b>)</span>
                    <span style="color: #aaa; font-size: 11px;">Código: <b>${u.codigo}</b></span>
                    <span style="color: #5dade2; font-size: 11px; font-weight: bold;">📅 Reg: ${fRegistro}</span>
                </div>
                <button class="btn-delete" onclick="eliminarUsuario('${u.codigo}')">🗑️ Borrar</button>
            `;
            userListDiv.appendChild(item);
        });
    } catch (e) {
        userListDiv.innerHTML = "<div style='color: red; padding: 10px;'>❌ Error al enlazar listado remoto.</div>";
    }
}

window.eliminarUsuario = async function(codigo) {
    if (usuarioLogueado && usuarioLogueado.codigo === codigo) {
        alert("❌ No puedes eliminar tu propio usuario de administrador mientras tienes la sesión iniciada.");
        return;
    }

    const confirmar = confirm(`⚠ ¿Estás seguro de que deseas eliminar permanentemente a este usuario de la nube?`);
    
    if (confirmar) {
        try {
            const { error } = await dbCentral
                .from('usuarios')
                .delete()
                .eq('codigo', codigo);

            if (error) throw error;

            actualizarListaUsuariosAdmin();
        } catch (e) {
            alert("❌ No se pudo eliminar el registro de la base de datos central.");
        }
    }
};

// --- REPORTE DE EXCEL CENTRALIZADO ---
async function descargarExcelNativo() {
    mostrarMensaje('🔄 Solicitando registros históricos al servidor central...', 'orange');

    const { data: todosLosRegistros, error: queryError } = await dbCentral
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
