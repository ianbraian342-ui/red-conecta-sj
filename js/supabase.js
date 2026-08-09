// ============================================
// SUPABASE - CLIENTE Y OPERACIONES
// Red Conecta San Juan
// Usa la API REST de Supabase (PostgREST) directamente con fetch
// ============================================

// Token actual: si hay sesión iniciada se usa su JWT para que las
// políticas RLS de lectura admin funcionen; si no, se usa la anon key.
function tokenActual() {
    return sessionStorage.getItem('sb_access_token') || SUPABASE_ANON_KEY;
}

// Cabeceras básicas necesarias para autenticarse contra Supabase
function headersSupabase(extraHeaders = {}) {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${tokenActual()}`,
        'Content-Type': 'application/json',
        ...extraHeaders
    };
}

// Construir un mensaje de error legible a partir de la respuesta de Supabase.
// Incluye el código y mensaje reales del servidor (p. ej. 42501 de RLS) más
// una pista cuando es un problema típico de configuración.
async function errorSupabase(response, prefijo, pista) {
    let detalle = '';
    try {
        const data = await response.json();
        if (data && typeof data === 'object') {
            const partes = [];
            if (data.code) partes.push(data.code);
            if (data.message) partes.push(data.message);
            if (partes.length) detalle = `: ${partes.join(' - ')}`;
        }
    } catch (e) {
        // El cuerpo puede no ser JSON; se ignora
    }

    let pistaTexto = pista || '';
    if (!pistaTexto && response.status === 401) {
        pistaTexto = ' Posible causa: políticas RLS que no permiten esta operación (ejecutá sql/setup_conecta.sql).';
    } else if (!pistaTexto && response.status === 404) {
        pistaTexto = ' Posible causa: la tabla no existe en Supabase (ejecutá sql/setup_conecta.sql).';
    } else if (!pistaTexto && response.status === 400) {
        pistaTexto = ' Posible causa: bucket de Storage inexistente o datos inválidos.';
    }

    return `${prefijo} (${response.status})${detalle}${pistaTexto}`;
}

/* ============================================
   REGISTROS / PERFILES - CRUD
   ============================================ */

// INSERT: guardar un registro del formulario
async function insertarRegistro(datos) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/registros`, {
        method: 'POST',
        headers: headersSupabase({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(datos)
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, 'Error al guardar el registro'));
    }

    return response.json();
}

// SELECT: listar todos los registros (panel admin, requiere sesión)
async function listarRegistros() {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/registros?select=*&order=fecha_registro.desc`,
        { headers: headersSupabase() }
    );

    if (!response.ok) {
        throw new Error(await errorSupabase(response, 'Error al consultar los registros'));
    }

    return response.json();
}

// DELETE: eliminar un registro por id (panel admin)
async function eliminarRegistro(id) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/registros?id=eq.${id}`, {
        method: 'DELETE',
        headers: headersSupabase()
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(response, 'Error al eliminar el registro'));
    }
}

/* ============================================
   ARCHIVOS - SUPABASE STORAGE
   Bucket "archivos-perfil" (público)
   ============================================ */

// Sube un archivo (CV, flyer, presentación) al bucket "archivos-perfil"
// y devuelve { url, nombre } con la URL pública y el nombre original.
async function subirArchivoPerfil(file) {
    if (!file) throw new Error('No hay archivo para subir');

    const extension = (file.name.split('.').pop() || 'bin').toLowerCase();
    const ruta = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/archivos-perfil/${ruta}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${tokenActual()}`,
            'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
    });

    if (!response.ok) {
        throw new Error(await errorSupabase(
            response,
            'Error al subir el archivo',
            ' Verificá que el bucket "archivos-perfil" exista (ejecutá sql/setup_conecta.sql).'
        ));
    }

    return {
        url: getArchivoPublicoURL(ruta),
        nombre: file.name
    };
}

// URL pública de un archivo dentro del bucket "archivos-perfil"
function getArchivoPublicoURL(ruta) {
    return `${SUPABASE_URL}/storage/v1/object/public/archivos-perfil/${ruta}`;
}
