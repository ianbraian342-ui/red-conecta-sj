// ============================================
// AUTENTICACIÓN - Supabase Auth (API REST)
// Red Conecta San Juan
// Login, logout y verificación de sesión para el panel admin
// ============================================

// Iniciar sesión con email y contraseña.
// Guarda el access_token y el usuario en sessionStorage.
async function iniciarSesion(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: headersSupabase(),
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error('Email o contraseña incorrectos');
    }

    const data = await response.json();
    sessionStorage.setItem('sb_access_token', data.access_token);
    sessionStorage.setItem('sb_user', JSON.stringify(data.user));
    return data;
}

// Cerrar sesión. Si redirigir es true, vuelve a admin.html.
function cerrarSesion(redirigir = true) {
    sessionStorage.removeItem('sb_access_token');
    sessionStorage.removeItem('sb_user');
    if (redirigir) {
        window.location.href = 'admin.html';
    }
}

// Verificar si hay una sesión activa
function verificarSesion() {
    const token = sessionStorage.getItem('sb_access_token');
    const user = sessionStorage.getItem('sb_user');
    return Boolean(token && user);
}

// Obtener el usuario actual o null si no hay sesión
function obtenerUsuario() {
    const user = sessionStorage.getItem('sb_user');
    return user ? JSON.parse(user) : null;
}

// Nombre para mostrar (del metadata de registro o fallback al email)
function nombreUsuario() {
    const usuario = obtenerUsuario();
    if (!usuario) return '';
    return (usuario.user_metadata && usuario.user_metadata.nombre) || usuario.email || 'Administrador';
}
