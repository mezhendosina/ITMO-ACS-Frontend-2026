<script setup>
import { onMounted, ref } from "vue";
import { api } from "../services/api.js";
import { useApiState } from "../composables/useApiState.js";
import { useFavorites } from "../composables/useFavorites.js";
import { useAuth } from "../composables/useAuth.js";
import ApiState from "../components/ApiState.vue";

const props = defineProps({ id: String });
const emit = defineEmits(["notify"]);
const recipe = ref(null),
  comments = ref([]),
  text = ref(""),
  sending = ref(false);
const { user } = useAuth();
const { loading, error, run } = useApiState();
const { load: loadFavorites, toggle, isFavorite } = useFavorites();
async function load() {
  try {
    await run(async () => {
      const [{ data: recipeData }, { data: commentData }] = await Promise.all([
        api.get(`/recipes/${props.id}`),
        api.get("/comments", {
          params: { recipeId: props.id, _sort: "createdAt", _order: "desc" },
        }),
        loadFavorites(),
      ]);
      recipe.value = recipeData;
      comments.value = commentData;
    });
  } catch {}
}
async function toggleFavorite() {
  try {
    await toggle(props.id);
    emit(
      "notify",
      isFavorite(props.id) ? "Рецепт сохранён" : "Рецепт удалён из сохранённых",
    );
  } catch (e) {
    emit("notify", e.message);
  }
}
async function addComment() {
  if (!user.value) return emit("notify", "Войдите, чтобы оставить комментарий");
  if (!text.value.trim()) return;
  sending.value = true;
  try {
    const { data } = await api.post("/comments", {
      recipeId: String(props.id),
      userId: String(user.value.id),
      author: `${user.value.name} ${user.value.surname}`,
      text: text.value.trim(),
      createdAt: new Date().toISOString(),
    });
    comments.value.unshift(data);
    text.value = "";
    emit("notify", "Комментарий опубликован");
  } catch (e) {
    emit("notify", e.userMessage || e.message);
  } finally {
    sending.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="section-pad">
    <div class="container">
      <ApiState v-if="loading" message="Загружаем рецепт…" /><ApiState
        v-else-if="error"
        kind="error"
        :message="error"
        @retry="load"
      /><template v-else-if="recipe"
        ><div class="recipe-intro">
          <div :class="['recipe-visual', 'recipe-photo', recipe.visual]">
            <span class="food-emoji">{{ recipe.emoji }}</span>
          </div>
          <div>
            <span class="eyebrow"
              >{{ recipe.typeLabel }} · {{ recipe.cuisine }}</span
            >
            <h1 class="display-title compact">{{ recipe.title }}</h1>
            <p class="lead">{{ recipe.description }}</p>
            <div class="facts">
              <div>
                <small>Подготовка</small
                ><strong>{{ recipe.prepTime }} минут</strong>
              </div>
              <div>
                <small>Готовка</small
                ><strong>{{ recipe.cookTime }} минут</strong>
              </div>
              <div>
                <small>Порции</small><strong>{{ recipe.servings }}</strong>
              </div>
            </div>
            <button
              :class="['button', isFavorite(recipe.id) ? 'primary' : 'outline']"
              @click="toggleFavorite"
            >
              {{ isFavorite(recipe.id) ? "♥ Сохранено" : "♡ Сохранить" }}
            </button>
          </div>
        </div>
        <div class="recipe-content">
          <div>
            <h2>Ингредиенты</h2>
            <ul class="lined-list">
              <li v-for="item in recipe.ingredients" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div>
            <h2>Как готовить</h2>
            <ol class="steps">
              <li v-for="(step, index) in recipe.steps" :key="step">
                <span>{{ index + 1 }}</span
                >{{ step }}
              </li>
            </ol>
          </div>
        </div>
        <section class="comments">
          <h2>
            Комментарии <span class="muted">{{ comments.length }}</span>
          </h2>
          <form class="paper-card comment-form" @submit.prevent="addComment">
            <label for="comment">Ваш комментарий</label
            ><textarea id="comment" v-model="text" rows="3" required></textarea
            ><button class="button primary" :disabled="sending">
              {{ sending ? "Публикуем…" : "Опубликовать" }}
            </button>
          </form>
          <ApiState
            v-if="!comments.length"
            kind="empty"
            message="Комментариев пока нет. Будьте первым!"
          />
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="comment"
          >
            <div class="avatar">
              {{
                comment.author
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
              }}
            </div>
            <div>
              <strong>{{ comment.author }}</strong>
              <small class="muted">{{
                new Date(comment.createdAt).toLocaleDateString("ru-RU")
              }}</small>
              <p>{{ comment.text }}</p>
            </div>
          </article>
        </section></template
      >
    </div>
  </section>
</template>
