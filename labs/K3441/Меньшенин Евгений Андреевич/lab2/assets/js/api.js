const API_URL = 'http://localhost:3000';

const session = {
  get token() { return localStorage.getItem('lozhka_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('lozhka_user')); }
    catch { return null; }
  },
  save(data) {
    localStorage.setItem('lozhka_token', data.accessToken);
    localStorage.setItem('lozhka_user', JSON.stringify(data.user));
  },
  clear() {
    localStorage.removeItem('lozhka_token');
    localStorage.removeItem('lozhka_user');
  }
};

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Не удалось связаться с API. Запустите npm start и попробуйте снова.');
  }

  if (!response.ok) {
    let message = `Ошибка API: ${response.status}`;
    try { message = (await response.json()).message || message; } catch { /* empty body */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

window.LozhkaApi = { api, session, API_URL };
