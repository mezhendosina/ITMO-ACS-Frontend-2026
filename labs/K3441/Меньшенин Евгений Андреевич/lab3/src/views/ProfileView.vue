<script setup>
import { onMounted, ref } from "vue";
import { api } from "../services/api.js";
import { useAuth } from "../composables/useAuth.js";
import { useFavorites } from "../composables/useFavorites.js";
import { useApiState } from "../composables/useApiState.js";
import RecipeGrid from "../components/RecipeGrid.vue";
import ApiState from "../components/ApiState.vue";
const emit = defineEmits(["notify"]),
  { user } = useAuth(),
  recipes = ref([]),
  { favorites, load: loadFavorites, toggle, isFavorite } = useFavorites(),
  { loading, error, run } = useApiState();
async function load() {
  try {
    await run(async () => {
      await loadFavorites();
      const responses = await Promise.all(
        favorites.value.map((item) => api.get(`/recipes/${item.recipeId}`)),
      );
      recipes.value = responses.map((item) => item.data);
    });
  } catch {}
}
async function toggleFavorite(id) {
  try {
    await toggle(id);
    recipes.value = recipes.value.filter(
      (recipe) => String(recipe.id) !== String(id),
    );
    emit("notify", "Рецепт удалён из сохранённых");
  } catch (e) {
    emit("notify", e.message);
  }
}
onMounted(load);
</script>
<template>
  <section class="profile-cover"></section>
  <section class="container profile">
    <div class="avatar large">
      {{ `${user.name[0]}${user.surname[0]}`.toUpperCase() }}
    </div>
    <h1>{{ user.name }} {{ user.surname }}</h1>
    <p class="muted">
      @{{ user.username || user.email.split("@")[0] }} ·
      {{ user.city || "Город не указан" }}
    </p>
    <p class="lead bio">{{ user.bio || "Описание пока не заполнено." }}</p>
    <div class="stats">
      <div>
        <strong>{{ recipes.length }}</strong
        ><span>сохранено</span>
      </div>
      <div><strong>6</strong><span>рецептов</span></div>
      <div><strong>128</strong><span>читателей</span></div>
    </div>
    <div class="section-heading profile-heading">
      <h2 class="section-title">Сохранённые рецепты</h2>
    </div>
    <ApiState
      v-if="loading"
      message="Загружаем сохранённые рецепты…"
    /><ApiState
      v-else-if="error"
      kind="error"
      :message="error"
      @retry="load"
    /><ApiState
      v-else-if="!recipes.length"
      kind="empty"
      message="Сохранённых рецептов пока нет."
    /><RecipeGrid
      v-else
      :recipes="recipes"
      :is-favorite="isFavorite"
      @toggle-favorite="toggleFavorite"
    />
  </section>
</template>
