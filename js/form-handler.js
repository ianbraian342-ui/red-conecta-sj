// ============================================
// MANEJADOR DEL FORMULARIO (Form Handler)
// Red Conecta San Juan
// - Validación por paso
// - Recolección de datos
// - Envío a Supabase (insert + subida de archivo)
// - Pantalla de éxito
// ============================================

const ManejadorFormulario = (() => {
    const $ = (id) => document.getElementById(id);

    const EXTENSIONES_PERMITIDAS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const TAMANO_MAXIMO_MB = 5;

    // Archivo seleccionado en el Paso 4 (o null)
    let archivoSeleccionado = null;

    /* ============================================
       VALIDACIÓN - UTILIDADES
       ============================================ */
    function esEmailValido(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function esWhatsappValido(whatsapp) {
        const soloDigitos = whatsapp.replace(/\D/g, '');
        return soloDigitos.length >= 8 && soloDigitos.length <= 15;
    }

    // Validar un campo simple (input/select/textarea) de un grupo
    function validarCampoSimple(grupoId, condicionValida) {
        if (condicionValida()) {
            UIControlador.marcarCampoValido(grupoId);
            return true;
        }
        UIControlador.marcarCampoInvalido(grupoId);
        return false;
    }

    /* ============================================
       VALIDACIÓN POR PASO
       ============================================ */
    function validarPaso1() {
        if (UIControlador.getPerfil()) {
            $('error-perfil').hidden = true;
            return true;
        }
        UIControlador.mostrarErrorPerfil();
        return false;
    }

    function validarPaso2() {
        const localidad = $('localidad').value;
        const localidadOtra = $('localidad_otra').value.trim();
        const esOtra = localidad === 'otra';

        const nombreOk = validarCampoSimple('grupo-nombre', () => $('nombre_apellido').value.trim().length >= 3);
        const localidadOk = validarCampoSimple('grupo-localidad', () =>
            localidad !== '' && (!esOtra || localidadOtra.length >= 2)
        );
        const whatsappOk = validarCampoSimple('grupo-whatsapp', () => esWhatsappValido($('whatsapp').value.trim()));
        const emailOk = validarCampoSimple('grupo-email', () => esEmailValido($('email').value.trim()));

        return nombreOk && localidadOk && whatsappOk && emailOk;
    }

    function validarPaso3() {
        const perfil = UIControlador.getPerfil();
        const config = UIControlador.PERFILES[perfil];
        if (!config) return false;

        let todoOk = true;

        config.campos.forEach((campo) => {
            if (!campo.required) return;
            const grupoId = `grupo-${campo.id}`;

            let ok = false;
            switch (campo.tipo) {
                case 'text':
                case 'textarea':
                    ok = $(campo.id).value.trim().length > 0;
                    break;
                case 'select':
                    ok = $(campo.id).value !== '';
                    break;
                case 'radio':
                    ok = document.querySelector(`input[name="${campo.id}"]:checked`) !== null;
                    break;
                case 'checkbox':
                    ok = document.querySelectorAll(`input[name="${campo.id}"]:checked`).length > 0;
                    break;
            }

            if (ok) {
                UIControlador.marcarCampoValido(grupoId);
            } else {
                UIControlador.marcarCampoInvalido(grupoId);
                todoOk = false;
            }
        });

        return todoOk;
    }

    function validarPaso4() {
        // El archivo es opcional: solo se valida formato y tamaño si hay uno
        if (!archivoSeleccionado) return true;

        const extension = archivoSeleccionado.name.split('.').pop().toLowerCase();
        const extensionOk = EXTENSIONES_PERMITIDAS.includes(extension);
        const tamanoOk = archivoSeleccionado.size <= TAMANO_MAXIMO_MB * 1024 * 1024;

        if (extensionOk && tamanoOk) {
            UIControlador.marcarCampoValido('grupo-archivo');
            return true;
        }
        UIControlador.marcarCampoInvalido('grupo-archivo');
        return false;
    }

    function validarPaso5() {
        const preferenciasOk = validarCampoSimple('grupo-preferencias', () =>
            document.querySelectorAll('input[name="preferencias"]:checked').length > 0
        );
        const autorizacionesOk = validarCampoSimple('grupo-autorizaciones', () =>
            $('autoriza_datos').checked && $('autoriza_contacto').checked
        );

        return preferenciasOk && autorizacionesOk;
    }

    // Validar el paso actual antes de avanzar o enviar
    function validarPasoActual() {
        const paso = UIControlador.getPasoActual();
        switch (paso) {
            case 1: return validarPaso1();
            case 2: return validarPaso2();
            case 3: return validarPaso3();
            case 4: return validarPaso4();
            case 5: return validarPaso5();
            default: return true;
        }
    }

    /* ============================================
       RECOLECCIÓN DE DATOS
       ============================================ */
    function localidadFinal() {
        const localidad = $('localidad').value;
        if (localidad === 'otra') {
            return $('localidad_otra').value.trim();
        }
        return localidad;
    }

    function recopilarPerfilDetalles() {
        const perfil = UIControlador.getPerfil();
        const config = UIControlador.PERFILES[perfil];
        if (!config) return {};

        const detalles = {};

        config.campos.forEach((campo) => {
            switch (campo.tipo) {
                case 'text':
                case 'textarea':
                case 'select':
                    detalles[campo.id] = $(campo.id).value.trim();
                    break;
                case 'radio':
                    const radio = document.querySelector(`input[name="${campo.id}"]:checked`);
                    detalles[campo.id] = radio ? radio.value : '';
                    break;
                case 'checkbox':
                    detalles[campo.id] = [...document.querySelectorAll(`input[name="${campo.id}"]:checked`)]
                        .map((el) => el.value);
                    break;
            }
        });

        return detalles;
    }

    function recopilarDatos() {
        const preferencias = [...document.querySelectorAll('input[name="preferencias"]:checked')]
            .map((el) => el.value);

        const datos = {
            tipo_perfil: UIControlador.getPerfil(),
            nombre_apellido: $('nombre_apellido').value.trim(),
            localidad: localidadFinal(),
            whatsapp: $('whatsapp').value.trim(),
            email: $('email').value.trim(),
            red_social: $('red_social').value.trim(),
            perfil_detalles: recopilarPerfilDetalles(),
            preferencias,
            autoriza_datos: $('autoriza_datos').checked,
            autoriza_contacto: $('autoriza_contacto').checked
        };

        return datos;
    }

    /* ============================================
       PASO 4: MANEJO DEL ARCHIVO
       ============================================ */
    function initArchivo() {
        const input = $('archivo');
        const zona = $('zona-archivo');
        if (!input || !zona) return;

        input.addEventListener('change', () => {
            const archivo = input.files && input.files[0];
            if (archivo) {
                archivoSeleccionado = archivo;
                mostrarArchivoSeleccionado();
            }
        });

        // Arrastrar y soltar
        ['dragenter', 'dragover'].forEach((evt) => {
            zona.addEventListener(evt, (e) => {
                e.preventDefault();
                zona.classList.add('dragging');
            });
        });
        ['dragleave', 'drop'].forEach((evt) => {
            zona.addEventListener(evt, (e) => {
                e.preventDefault();
                zona.classList.remove('dragging');
            });
        });
        zona.addEventListener('drop', (e) => {
            const archivo = e.dataTransfer.files && e.dataTransfer.files[0];
            if (archivo) {
                archivoSeleccionado = archivo;
                input.files = e.dataTransfer.files;
                mostrarArchivoSeleccionado();
            }
        });

        $('archivo-quitar').addEventListener('click', quitarArchivo);
    }

    function mostrarArchivoSeleccionado() {
        $('zona-archivo').hidden = true;
        $('archivo-nombre').textContent = `${archivoSeleccionado.name} (${formatearTamanio(archivoSeleccionado.size)})`;
        $('archivo-info').hidden = false;
        UIControlador.marcarCampoValido('grupo-archivo');
    }

    function quitarArchivo() {
        archivoSeleccionado = null;
        $('archivo').value = '';
        $('zona-archivo').hidden = false;
        $('archivo-info').hidden = true;
        UIControlador.marcarCampoValido('grupo-archivo');
    }

    function formatearTamanio(bytes) {
        if (bytes < 1024 * 1024) {
            return Math.round(bytes / 1024) + ' KB';
        }
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /* ============================================
       LOCALIDAD "OTRA"
       ============================================ */
    function initLocalidad() {
        const select = $('localidad');
        const inputOtra = $('localidad_otra');
        if (!select) return;

        const actualizar = () => {
            inputOtra.hidden = select.value !== 'otra';
            if (select.value !== 'otra') {
                inputOtra.value = '';
            }
        };

        select.addEventListener('change', actualizar);
        actualizar();
    }

    /* ============================================
       ENVÍO DEL FORMULARIO
       ============================================ */
    function mostrarMensaje(texto, tipo) {
        const mensaje = $('formulario-mensaje');
        mensaje.hidden = false;
        mensaje.textContent = texto;
        mensaje.className = `formulario-mensaje ${tipo}`;
    }

    function ocultarMensaje() {
        $('formulario-mensaje').hidden = true;
        $('formulario-mensaje').className = 'formulario-mensaje';
    }

    async function enviar() {
        const datos = recopilarDatos();

        try {
            // 1) Subir archivo si corresponde (opcional)
            if (archivoSeleccionado) {
                const resultado = await subirArchivoPerfil(archivoSeleccionado);
                datos.archivo_url = resultado.url;
                datos.archivo_nombre = resultado.nombre;
            }

            // 2) Guardar el registro en Supabase
            await insertarRegistro(datos);

            // 3) Pantalla de éxito
            UIControlador.setEnviando(false);
            UIControlador.irAPaso(6);
        } catch (error) {
            UIControlador.setEnviando(false);
            mostrarMensaje('❌ ' + error.message, 'error');
        }
    }

    /* ============================================
       EVENTOS PRINCIPALES
       ============================================ */
    function init() {
        // Botón Siguiente
        $('btn-siguiente').addEventListener('click', () => {
            if (validarPasoActual()) {
                UIControlador.irAlSiguiente();
            }
        });

        // Botón Atrás
        $('btn-anterior').addEventListener('click', () => {
            UIControlador.irAlAnterior();
        });

        // Envío del formulario (paso 5)
        $('formulario-red').addEventListener('submit', async (e) => {
            e.preventDefault();
            ocultarMensaje();

            if (!validarPasoActual()) return;

            UIControlador.setEnviando(true);
            await enviar();
        });

        // Limpiar mensajes de error al volver a un paso
        initLocalidad();
        initArchivo();

        // Año dinámico del pie de página
        const anio = $('anio');
        if (anio) anio.textContent = new Date().getFullYear();

        // Actualizar el texto de ayuda del Paso 4 según el perfil elegido
        $('paso4-subtitulo').textContent = UIControlador.textoPaso4();
    }

    return {
        init,
        validarPasoActual
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    ManejadorFormulario.init();
});
