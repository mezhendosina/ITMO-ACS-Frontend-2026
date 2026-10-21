import { computed, ref } from "vue";
import { api } from "../services/api.js";

const stored = localStorage.getItem("lozhka_user");
const user = ref(stored ? JSON.parse(stored) : null);

export function useAuth() {
  const isAuthenticated = computed(() => Boolean(user.value));
  function save(data) {
    localStorage.setItem("lozhka_token", data.accessToken);
    localStorage.setItem("lozhka_user", JSON.stringify(data.user));
    user.value = data.user;
  }
  async function login(credentials) {
    const { data } = await api.post("/login", credentials);
    save(data);
  }
  async function register(payload) {
    const { data } = await api.post("/register", payload);
    save(data);
  }
  function logout() {
    localStorage.removeItem("lozhka_token");
    localStorage.removeItem("lozhka_user");
    user.value = null;
  }
  return { user, isAuthenticated, login, register, logout };
}
