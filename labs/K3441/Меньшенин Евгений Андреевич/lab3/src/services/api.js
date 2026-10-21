import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lozhka_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) error.userMessage = 'Не удалось связаться с API. Убедитесь, что сервер запущен.'
    else error.userMessage = error.response.data?.message || `Ошибка API: ${error.response.status}`
    return Promise.reject(error)
  },
)
