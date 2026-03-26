export function getAuthStr() {
    return sessionStorage.getItem('auth') || localStorage.getItem('auth');
}

export function getAuth() {
    const str = getAuthStr();
    try { return str ? JSON.parse(str) : null; } catch { return null; }
}

export function getJwtToken() {
    return sessionStorage.getItem('jwt') || localStorage.getItem('jwt');
}

export function clearAuth() {
    ['auth', 'jwt'].forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
    });
}
