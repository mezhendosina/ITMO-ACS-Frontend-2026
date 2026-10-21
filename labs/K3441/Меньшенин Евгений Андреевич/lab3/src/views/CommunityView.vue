<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/api.js'
import { useAuth } from '../composables/useAuth.js'
const emit = defineEmits(['notify']), { user } = useAuth(), follows = ref([])
const authors = [{ id: '2', name: 'Анна Котова', role: 'Домашняя выпечка', initials: 'АК' }, { id: '3', name: 'Илья Орлов', role: 'Быстрые ужины', initials: 'ИО' }, { id: '4', name: 'Софья Миронова', role: 'Полезное питание', initials: 'СМ' }]
onMounted(async () => { if (user.value) try { follows.value = (await api.get('/follows', { params: { userId: user.value.id } })).data } catch (e) { emit('notify', e.userMessage || e.message) } })
const followed = id => follows.value.some(item => String(item.authorId) === String(id))
async function toggle(authorId) { if (!user.value) return emit('notify', 'Войдите, чтобы подписаться'); try { const item = follows.value.find(item => String(item.authorId) === String(authorId)); if (item) { await api.delete(`/follows/${item.id}`); follows.value = follows.value.filter(i => i.id !== item.id); emit('notify', 'Подписка отменена') } else { const { data } = await api.post('/follows', { userId: String(user.value.id), authorId: String(authorId) }); follows.value.push(data); emit('notify', 'Автор добавлен в подписки') } } catch (e) { emit('notify', e.userMessage || e.message) } }
</script>
<template><section class="page-hero"><div class="container"><span class="eyebrow">Сообщество</span><h1 class="section-title">Готовим вместе</h1><p class="lead">Следите за любимыми авторами и находите новые идеи.</p></div></section><section class="section-pad"><div class="container author-grid"><article v-for="author in authors" :key="author.id" class="paper-card author-card"><div class="avatar">{{ author.initials }}</div><h2>{{ author.name }}</h2><p class="muted">{{ author.role }}</p><button :class="['button', followed(author.id) ? 'primary' : 'outline']" @click="toggle(author.id)">{{ followed(author.id) ? 'Вы подписаны' : 'Подписаться' }}</button></article></div></section></template>
