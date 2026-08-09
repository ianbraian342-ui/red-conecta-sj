// ============================================
// CONTROLADOR DE INTERFAZ (UI Controller)
// Red Conecta San Juan
// - Scroll suave hacia el formulario (CTAs)
// - Navegación entre pasos con transiciones
// - Render dinámico del Paso 3 según el perfil
// - Indicador de progreso
// ============================================

// Escape de HTML para evitar inyección de contenido en los campos dinámicos
function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// Opciones de experiencia para profesionales / técnicos / búsqueda laboral
const OPCIONES_EXPERIENCIA = [
    'Sin experiencia',
    'Menos de 1 año',
    '1 a 3 años',
    '3 a 10 años',
    'Más de 10 años'
];

// Años de cursada para estudiantes
const OPCIONES_ANIO = [
    '1° año', '2° año', '3° año', '4° año', '5° año', '6° año',
    'Último año / Egresando', 'Egresado/a'
];

// Configuración de cada perfil: qué campos se muestran en el Paso 3.
// Cada campo soporta los tipos: text, textarea, select, radio, checkbox.
const PERFILES = {
    profesional: {
        etiqueta: 'Profesional',
        icono: '🎓',
        subtitulo: 'Contanos sobre tu profesión y qué buscás en la red.',
        paso4: 'Adjuntá tu CV (PDF, DOC, DOCX, JPG o PNG).',
        campos: [
            { tipo: 'text', id: 'profesion', label: 'Profesión / actividad', required: true, placeholder: 'Ej: Contadora pública' },
            { tipo: 'text', id: 'especialidad', label: 'Especialidad', required: false, placeholder: 'Ej: Auditoría impositiva' },
            { tipo: 'radio', id: 'experiencia', label: 'Experiencia', required: true, opciones: OPCIONES_EXPERIENCIA },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Oportunidades laborales', 'Clientes', 'Alianzas estratégicas', 'Networking'] }
        ]
    },
    tecnico: {
        etiqueta: 'Técnico / oficio',
        icono: '🛠️',
        subtitulo: 'Contanos sobre tu oficio y qué buscás en la red.',
        paso4: 'Adjuntá tu CV (PDF, DOC, DOCX, JPG o PNG).',
        campos: [
            { tipo: 'text', id: 'profesion', label: 'Oficio / actividad técnica', required: true, placeholder: 'Ej: Electricista' },
            { tipo: 'text', id: 'especialidad', label: 'Especialidad', required: false, placeholder: 'Ej: Instalaciones industriales' },
            { tipo: 'radio', id: 'experiencia', label: 'Experiencia', required: true, opciones: OPCIONES_EXPERIENCIA },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Oportunidades laborales', 'Clientes', 'Proveedores', 'Networking'] }
        ]
    },
    busco_trabajo: {
        etiqueta: 'Busco trabajo',
        icono: '🔍',
        subtitulo: 'Contanos sobre tu experiencia y qué tipo de trabajo buscás.',
        paso4: 'Adjuntá tu CV (PDF, DOC, DOCX, JPG o PNG).',
        campos: [
            { tipo: 'text', id: 'profesion', label: 'Profesión / actividad', required: true, placeholder: 'Ej: Administrativa' },
            { tipo: 'text', id: 'especialidad', label: 'Especialidad', required: false, placeholder: 'Ej: Liquidación de sueldos' },
            { tipo: 'radio', id: 'experiencia', label: 'Experiencia', required: true, opciones: OPCIONES_EXPERIENCIA },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Primer empleo', 'Empleo', 'Cambio laboral', 'Pasantía'] }
        ]
    },
    emprendedor: {
        etiqueta: 'Emprendedor/a',
        icono: '🚀',
        subtitulo: 'Contanos sobre tu emprendimiento.',
        paso4: 'Adjuntá un flyer o presentación de tu emprendimiento.',
        campos: [
            { tipo: 'text', id: 'nombre_emprendimiento', label: 'Nombre del emprendimiento', required: true, placeholder: 'Ej: Dulces Sanjuaninos' },
            { tipo: 'text', id: 'rubro', label: 'Rubro', required: true, placeholder: 'Ej: Alimentación artesanal' },
            { tipo: 'text', id: 'localidad_emprendimiento', label: 'Localidad del emprendimiento', required: false, placeholder: 'Ej: Rawson' },
            { tipo: 'textarea', id: 'ofreces', label: '¿Qué ofrecés?', required: true, placeholder: 'Describí brevemente tu producto o servicio' },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Clientes', 'Difusión', 'Networking', 'Alianzas', 'Financiamiento'] }
        ]
    },
    empresa: {
        etiqueta: 'Empresa / PyME',
        icono: '🏢',
        subtitulo: 'Contanos sobre tu empresa y sus necesidades.',
        paso4: 'Adjuntá un flyer o presentación de tu empresa.',
        campos: [
            { tipo: 'text', id: 'nombre_empresa', label: 'Nombre de la empresa', required: true, placeholder: 'Ej: Bodegas San Juan SA' },
            { tipo: 'text', id: 'rubro', label: 'Rubro / actividad', required: true, placeholder: 'Ej: Vitivinícola' },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué busca actualmente tu empresa?', required: true, opciones: ['Personal', 'Proveedores', 'Clientes', 'Alianzas comerciales'] }
        ]
    },
    estudiante: {
        etiqueta: 'Estudiante',
        icono: '📚',
        subtitulo: 'Contanos sobre tu formación y qué buscás.',
        paso4: 'Adjuntá tu CV o un resumen de tu formación.',
        campos: [
            { tipo: 'text', id: 'carrera', label: 'Carrera', required: true, placeholder: 'Ej: Ingeniería en Agrimensura' },
            { tipo: 'text', id: 'institucion', label: 'Institución educativa', required: true, placeholder: 'Ej: UNSJ' },
            { tipo: 'select', id: 'anio_cursado', label: 'Año que cursás', required: false, opciones: OPCIONES_ANIO },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Primer empleo', 'Pasantía', 'Prácticas', 'Capacitación'] }
        ]
    },
    institucion: {
        etiqueta: 'Institución / organización',
        icono: '🏛️',
        subtitulo: 'Contanos sobre tu institución y qué ofrece.',
        paso4: 'Adjuntá un flyer o presentación de tu institución.',
        campos: [
            { tipo: 'text', id: 'nombre_institucion', label: 'Nombre de la institución', required: true, placeholder: 'Ej: Municipalidad de Rawson' },
            { tipo: 'text', id: 'rubro', label: 'Rubro', required: true, placeholder: 'Ej: Sector público' },
            { tipo: 'textarea', id: 'ofreces', label: '¿Qué ofrecés?', required: false, placeholder: 'Describí brevemente la actividad de la institución' },
            { tipo: 'checkbox', id: 'interes', label: '¿Qué estás buscando?', required: true, opciones: ['Personal', 'Alianzas estratégicas', 'Networking', 'Difusión'] }
        ]
    }
};

// Nombres legibles de cada tipo de perfil
const ETIQUETAS_PERFIL = {
    profesional: 'Profesional',
    tecnico: 'Técnico / oficio',
    busco_trabajo: 'Busco trabajo',
    emprendedor: 'Emprendedor/a',
    empresa: 'Empresa / PyME',
    estudiante: 'Estudiante',
    institucion: 'Institución / organización'
};

const TOTAL_PASOS = 6;

const UIControlador = (() => {
    let pasoActual = 1;
    let perfilActual = null;

    // Referencias a elementos del DOM
    const $ = (id) => document.getElementById(id);

    /* ============================================
       SCROLL SUAVE (CTAs "QUIERO REGISTRARME")
       ============================================ */
    function initScroll() {
        document.querySelectorAll('[data-scroll]').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const destino = el.getAttribute('data-scroll');
                const target = document.querySelector(destino);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    /* ============================================
       MENÚ MÓVIL
       ============================================ */
    function initNavMovil() {
        const toggle = $('nav-toggle');
        const nav = document.querySelector('.header-nav');
        if (!toggle || !nav) return;

        toggle.addEventListener('click', () => {
            nav.classList.toggle('abierto');
        });

        // Cerrar el menú al tocar un enlace
        nav.querySelectorAll('a').forEach((enlace) => {
            enlace.addEventListener('click', () => nav.classList.remove('abierto'));
        });
    }

    /* ============================================
       NAVEGACIÓN ENTRE PASOS
       ============================================ */
    function mostrarPaso(n) {
        const pasos = document.querySelectorAll('.paso');
        pasos.forEach((paso) => {
            const numPaso = Number(paso.dataset.paso);
            paso.hidden = (numPaso !== n);
        });

        actualizarProgreso(n);
        actualizarBotonesNav(n);
    }

    function actualizarProgreso(n) {
        const items = document.querySelectorAll('.progreso-item');
        items.forEach((item) => {
            const numPaso = Number(item.dataset.paso);
            item.classList.toggle('activo', numPaso === n);
            item.classList.toggle('completado', numPaso < n);
        });
    }

    function actualizarBotonesNav(n) {
        const btnAnterior = $('btn-anterior');
        const btnSiguiente = $('btn-siguiente');
        const btnEnviar = $('btn-enviar');

        if (n === 1) {
            btnAnterior.hidden = true;
        } else {
            btnAnterior.hidden = false;
        }

        if (n === TOTAL_PASOS) {
            btnSiguiente.hidden = true;
            btnEnviar.hidden = true;
        } else if (n === TOTAL_PASOS - 1) {
            btnSiguiente.hidden = true;
            btnEnviar.hidden = false;
        } else {
            btnSiguiente.hidden = false;
            btnEnviar.hidden = true;
        }
    }

    // Navegar a un paso concreto (visual). La validación previa la
    // realiza el form-handler antes de llamar a esta función.
    function irAPaso(n) {
        if (n < 1 || n > TOTAL_PASOS) return;
        pasoActual = n;
        mostrarPaso(n);
        scrollFormularioTop();
    }

    function irAlSiguiente() {
        irAPaso(pasoActual + 1);
    }

    function irAlAnterior() {
        irAPaso(pasoActual - 1);
    }

    // Al cambiar de paso, ubicar el inicio del formulario para no perder contexto
    function scrollFormularioTop() {
        const formulario = $('formulario-red');
        if (formulario) {
            formulario.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /* ============================================
       PASO 1: SELECCIÓN DE PERFIL
       ============================================ */
    function initSeleccionPerfil() {
        const grid = $('grid-perfiles');
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const boton = e.target.closest('.opcion-perfil');
            if (!boton) return;

            seleccionarPerfil(boton.dataset.valor);
        });
    }

    function seleccionarPerfil(valor) {
        perfilActual = valor;

        // Marcar visualmente la opción elegida
        const botones = document.querySelectorAll('.opcion-perfil');
        botones.forEach((b) => {
            b.classList.toggle('seleccionada', b.dataset.valor === valor);
        });
        botones.forEach((b) => {
            b.setAttribute('aria-checked', b.dataset.valor === valor ? 'true' : 'false');
        });

        // Ocultar el error de perfil si estaba visible
        $('error-perfil').hidden = true;

        // Actualizar el texto de ayuda del Paso 4 según el perfil
        const paso4 = $('paso4-subtitulo');
        if (paso4) paso4.textContent = textoPaso4();

        // Re-renderizar el Paso 3 con los campos del nuevo perfil
        renderizarPaso3();
    }

    // Obtener el perfil seleccionado (para validación del Paso 1)
    function getPerfil() {
        return perfilActual;
    }

    /* ============================================
       PASO 3: RENDER DINÁMICO SEGÚN PERFIL
       ============================================ */
    function renderizarPaso3() {
        const contenedor = $('paso3-campos');
        const subtitulo = $('paso3-subtitulo');
        if (!contenedor) return;

        if (!perfilActual || !PERFILES[perfilActual]) {
            contenedor.innerHTML = '';
            if (subtitulo) subtitulo.textContent = 'Primero elegí tu perfil en el Paso 1.';
            return;
        }

        const perfil = PERFILES[perfilActual];
        if (subtitulo) subtitulo.textContent = perfil.subtitulo;

        contenedor.innerHTML = perfil.campos.map(renderCampo).join('');
    }

    // Generar el HTML de un campo según su tipo
    function renderCampo(campo) {
        const requerido = campo.required ? ' *' : '';
        let contenido = '';

        switch (campo.tipo) {
            case 'text':
                contenido = `
                    <input type="text" id="${campo.id}" name="${campo.id}" placeholder="${escaparHTML(campo.placeholder || '')}">
                `;
                break;

            case 'textarea':
                contenido = `
                    <textarea id="${campo.id}" name="${campo.id}" rows="3" placeholder="${escaparHTML(campo.placeholder || '')}"></textarea>
                `;
                break;

            case 'select':
                const opciones = (campo.opciones || [])
                    .map((op) => `<option value="${escaparHTML(op)}">${escaparHTML(op)}</option>`)
                    .join('');
                contenido = `
                    <select id="${campo.id}" name="${campo.id}">
                        <option value="">Seleccioná una opción</option>
                        ${opciones}
                    </select>
                `;
                break;

            case 'radio':
                const radios = (campo.opciones || [])
                    .map((op) => `
                        <label class="radio-opcion">
                            <input type="radio" name="${campo.id}" value="${escaparHTML(op)}">
                            <span>${escaparHTML(op)}</span>
                        </label>
                    `)
                    .join('');
                contenido = `<div class="grupo-opciones">${radios}</div>`;
                break;

            case 'checkbox':
                const checks = (campo.opciones || [])
                    .map((op) => `
                        <label class="check">
                            <input type="checkbox" name="${campo.id}" value="${escaparHTML(op)}">
                            <span>${escaparHTML(op)}</span>
                        </label>
                    `)
                    .join('');
                contenido = `<div class="lista-check">${checks}</div>`;
                break;

            default:
                contenido = '';
        }

        return `
            <div class="campo" id="grupo-${campo.id}">
                <label class="campo-etiqueta" for="${campo.id}">${escaparHTML(campo.label)}${requerido}</label>
                ${contenido}
                <span class="campo-error">Este campo es obligatorio</span>
            </div>
        `;
    }

    // Texto de ayuda del Paso 4 según el perfil
    function textoPaso4() {
        const perfil = perfilActual ? PERFILES[perfilActual] : null;
        return perfil ? perfil.paso4 : 'Adjuntá tu CV o un flyer de tu emprendimiento.';
    }

    /* ============================================
       VALIDACIÓN VISUAL (usado por form-handler)
       ============================================ */
    function marcarCampoInvalido(grupoId) {
        const grupo = $(grupoId);
        if (grupo) grupo.classList.add('invalido');
    }

    function marcarCampoValido(grupoId) {
        const grupo = $(grupoId);
        if (grupo) grupo.classList.remove('invalido');
    }

    function mostrarErrorPerfil() {
        $('error-perfil').hidden = false;
    }

    // Estado del formulario durante el envío
    function setEnviando(enviando) {
        const btnEnviar = $('btn-enviar');
        const btnAnterior = $('btn-anterior');
        if (!btnEnviar) return;

        btnEnviar.disabled = enviando;
        btnEnviar.classList.toggle('btn-loading', enviando);
        if (btnAnterior) btnAnterior.disabled = enviando;
    }

    /* ============================================
       INICIALIZACIÓN
       ============================================ */
    function init() {
        initScroll();
        initNavMovil();
        initSeleccionPerfil();
        mostrarPaso(1);
    }

    return {
        init,
        irAPaso,
        irAlSiguiente,
        irAlAnterior,
        getPasoActual: () => pasoActual,
        getPerfil,
        seleccionarPerfil,
        textoPaso4,
        marcarCampoInvalido,
        marcarCampoValido,
        mostrarErrorPerfil,
        setEnviando,
        PERFILES,
        ETIQUETAS_PERFIL
    };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UIControlador.init();
});
