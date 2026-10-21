<script setup>
import { reactive, ref } from 'vue'
const props = defineProps({ mode: { type: String, required: true } })
const emit = defineEmits(['submit'])
const form = reactive({ name: '', surname: '', email: '', password: '' })
const busy = ref(false)
async function submit() { busy.value = true; try { await emit('submit', { ...form }) } finally { busy.value = false } }
</script>
<template><form class="paper-card auth-card" @submit.prevent="submit"><span class="eyebrow">{{ mode === 'login' ? 'С возвращением' : 'Добро пожаловать' }}</span><h1>{{ mode === 'login' ? 'Вход' : 'Регистрация' }}</h1><template v-if="mode === 'register'"><label>Имя<input v-model.trim="form.name" name="name" autocomplete="given-name" required></label><label>Фамилия<input v-model.trim="form.surname" name="surname" autocomplete="family-name" required></label></template><label>Электронная почта<input v-model.trim="form.email" name="email" type="email" autocomplete="email" required></label><label>Пароль<input v-model="form.password" name="password" type="password" minlength="6" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required></label><button class="button primary wide" :disabled="busy">{{ busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт' }}</button><p v-if="mode === 'login'" class="muted">Нет аккаунта? <RouterLink to="/register">Зарегистрироваться</RouterLink></p><p v-else class="muted">Уже есть аккаунт? <RouterLink to="/login">Войти</RouterLink></p></form></template>
