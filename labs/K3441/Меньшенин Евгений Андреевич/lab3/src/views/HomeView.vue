<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../services/api.js'
import { useApiState } from '../composables/useApiState.js'
import { useFavorites } from '../composables/useFavorites.js'
import RecipeGrid from '../components/RecipeGrid.vue'
import ApiState from '../components/ApiState.vue'

const emit = defineEmits(['notify'])
const recipes = ref([])
const { loading, error, run } = useApiState()
const { load: loadFavorites, toggle, isFavorite } = useFavorites()
async function load() { try { await run(async () => { const [{ data }] = await Promise.all([api.get('/recipes', { params: { featured: true } }), loadFavorites()]); recipes.value = data }) } catch {} }
async function toggleFavorite(id) { try { await toggle(id); emit('notify', isFavorite(id) ? 'Рецепт сохранён' : 'Рецепт удалён из сохранённых') } catch (e) { emit('notify', e.message) } }
onMounted(load)
</script>
<template>
  <section class="hero"><div class="container hero-copy"><span class="eyebrow">Готовьте. Делитесь. Вдохновляйтесь.</span><h1 class="display-title">Рецепты с душой</h1><p class="lead">Домашние блюда, понятные шаги и сообщество людей, которые любят готовить.</p><form class="search-shell" @submit.prevent="$router.push({ name: 'catalog', query: { q: $event.target.q.value } })"><input name="q" aria-label="Поиск рецептов" placeholder="Что приготовить сегодня?"><button class="button primary">Найти рецепт</button></form></div></section>
  <section class="section-pad"><div class="container"><div class="section-heading"><div><span class="eyebrow">Выбор редакции</span><h2 class="section-title">Популярные рецепты</h2></div><RouterLink class="text-link" to="/recipes">Смотреть все →</RouterLink></div><ApiState v-if="loading" message="Загружаем рецепты…"/><ApiState v-else-if="error" kind="error" :message="error" @retry="load"/><RecipeGrid v-else :recipes="recipes" :is-favorite="isFavorite" @toggle-favorite="toggleFavorite"/></div></section>
</template>
