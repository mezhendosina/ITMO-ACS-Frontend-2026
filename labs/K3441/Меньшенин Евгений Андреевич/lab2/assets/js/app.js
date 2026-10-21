document.addEventListener('DOMContentLoaded', () => {
  const { api, session } = window.LozhkaApi;
  const page = document.body.dataset.page;
  const toastElement = document.querySelector('#liveToast');
  const toastBody = toastElement?.querySelector('.toast-body');

  const notify = (message) => {
    if (!toastElement) return;
    toastBody.textContent = message;
    if (window.bootstrap?.Toast) bootstrap.Toast.getOrCreateInstance(toastElement).show();
    else toastElement.classList.add('show');
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const showState = (container, kind, message) => {
    const icons = { loading: 'hourglass-split', error: 'exclamation-triangle', empty: 'search' };
    container.innerHTML = `<div class="col-12"><div class="api-state ${kind}" role="${kind === 'error' ? 'alert' : 'status'}"><i class="bi bi-${icons[kind]}"></i><p>${escapeHtml(message)}</p>${kind === 'error' ? '<button class="btn btn-outline-primary" type="button" onclick="location.reload()">Повторить</button>' : ''}</div></div>`;
  };

  const recipeCard = (recipe, favoriteIds = new Set()) => `
    <div class="col-md-6 col-lg-4 recipe-col">
      <article class="paper-card hoverable h-100">
        <div class="recipe-visual ${escapeHtml(recipe.visual)}"><span class="food-emoji">${escapeHtml(recipe.emoji)}</span><span class="time-pill"><i class="bi bi-clock"></i> ${recipe.time} мин</span></div>
        <div class="p-4"><div class="d-flex justify-content-between"><span class="tag-pill">${escapeHtml(recipe.difficultyLabel)}</span><span class="rating">★ ${String(recipe.rating).replace('.', ',')}</span></div>
          <h2 class="h4 mt-3">${escapeHtml(recipe.shortTitle || recipe.title)}</h2><p class="text-muted">${escapeHtml(recipe.description)}</p>
          <div class="d-flex justify-content-between align-items-center"><a href="recipe.html?id=${encodeURIComponent(recipe.id)}" class="btn btn-dark">Открыть</a><button class="btn btn-outline-primary icon-button ${favoriteIds.has(String(recipe.id)) ? 'active' : ''}" data-favorite-id="${escapeHtml(recipe.id)}" aria-label="Добавить в избранное"><i class="bi bi-heart${favoriteIds.has(String(recipe.id)) ? '-fill' : ''}"></i></button></div>
        </div>
      </article>
    </div>`;

  const requireUser = () => {
    if (session.user) return session.user;
    notify('Сначала войдите в аккаунт');
    setTimeout(() => { location.href = 'login.html'; }, 700);
    return null;
  };

  async function getFavorites() {
    if (!session.user) return [];
    return api(`/favorites?userId=${encodeURIComponent(session.user.id)}`);
  }

  async function toggleFavorite(button) {
    const user = requireUser();
    if (!user) return;
    button.disabled = true;
    try {
      const recipeId = String(button.dataset.favoriteId);
      const matches = await api(`/favorites?userId=${encodeURIComponent(user.id)}&recipeId=${encodeURIComponent(recipeId)}`);
      if (matches.length) {
        await api(`/favorites/${matches[0].id}`, { method: 'DELETE' });
        button.classList.remove('active');
        button.querySelector('i').className = 'bi bi-heart';
        notify('Рецепт удалён из сохранённых');
      } else {
        await api('/favorites', { method: 'POST', body: JSON.stringify({ userId: String(user.id), recipeId }) });
        button.classList.add('active');
        button.querySelector('i').className = 'bi bi-heart-fill';
        notify('Рецепт сохранён');
      }
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
  }

  document.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite-id]');
    if (favorite) toggleFavorite(favorite);
  });

  document.querySelectorAll('[data-logout]').forEach((button) => button.addEventListener('click', () => {
    session.clear();
    location.href = 'index.html';
  }));

  function updateAccountLinks() {
    if (!session.user) return;
    document.querySelectorAll('[data-guest-only]').forEach((node) => node.classList.add('d-none'));
    document.querySelectorAll('[data-user-only]').forEach((node) => node.classList.remove('d-none'));
  }

  async function initHome() {
    const container = document.querySelector('[data-home-recipes]');
    showState(container, 'loading', 'Загружаем рецепты…');
    try {
      const [recipes, favorites] = await Promise.all([api('/recipes?featured=true'), getFavorites()]);
      const ids = new Set(favorites.map((item) => String(item.recipeId)));
      container.innerHTML = recipes.map((recipe) => recipeCard(recipe, ids)).join('');
    } catch (error) { showState(container, 'error', error.message); }
  }

  async function initSearch() {
    const container = document.querySelector('[data-catalog]');
    const count = document.querySelector('[data-result-count]');
    const query = document.querySelector('[data-search]');
    const controls = [...document.querySelectorAll('[data-filter]')];
    query.value = new URLSearchParams(location.search).get('q') || '';
    let recipes = [];
    let favoriteIds = new Set();
    showState(container, 'loading', 'Загружаем каталог…');

    const render = () => {
      const text = query.value.trim().toLowerCase();
      const values = Object.fromEntries(controls.map((control) => [control.name, control.value]));
      const filtered = recipes.filter((recipe) => {
        const searchable = `${recipe.title} ${recipe.ingredients.join(' ')}`.toLowerCase();
        return (!text || searchable.includes(text)) && (!values.type || recipe.type === values.type) && (!values.difficulty || recipe.difficulty === values.difficulty) && (!values.time || recipe.time <= Number(values.time));
      });
      count.textContent = `${filtered.length} ${filtered.length === 1 ? 'рецепт' : filtered.length > 1 && filtered.length < 5 ? 'рецепта' : 'рецептов'}`;
      if (!filtered.length) return showState(container, 'empty', 'По вашему запросу ничего не найдено.');
      container.innerHTML = filtered.map((recipe) => recipeCard(recipe, favoriteIds)).join('');
    };

    try {
      const [data, favorites] = await Promise.all([api('/recipes'), getFavorites()]);
      recipes = data;
      favoriteIds = new Set(favorites.map((item) => String(item.recipeId)));
      render();
    } catch (error) { showState(container, 'error', error.message); count.textContent = 'Ошибка загрузки'; }
    query.addEventListener('input', render);
    controls.forEach((control) => control.addEventListener('change', render));
    document.querySelector('[data-reset]').addEventListener('click', () => { query.value = ''; controls.forEach((control) => { control.value = ''; }); render(); });
  }

  async function initRecipe() {
    const container = document.querySelector('[data-recipe]');
    const id = new URLSearchParams(location.search).get('id') || '1';
    showState(container, 'loading', 'Загружаем рецепт…');
    try {
      const [recipe, comments, favorites] = await Promise.all([api(`/recipes/${id}`), api(`/comments?recipeId=${id}&_sort=createdAt&_order=desc`), getFavorites()]);
      const saved = favorites.some((item) => String(item.recipeId) === String(id));
      container.innerHTML = `<nav aria-label="breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a href="index.html">Главная</a></li><li class="breadcrumb-item"><a href="search.html">Рецепты</a></li><li class="breadcrumb-item active">${escapeHtml(recipe.shortTitle)}</li></ol></nav>
        <div class="row align-items-center g-5 mt-1"><div class="col-lg-6"><div class="recipe-visual ${escapeHtml(recipe.visual)} recipe-photo-api"><span class="food-emoji">${escapeHtml(recipe.emoji)}</span></div></div><div class="col-lg-6"><span class="eyebrow">${escapeHtml(recipe.typeLabel)} · ${escapeHtml(recipe.cuisine)}</span><h1 class="display-title mt-3 mb-4">${escapeHtml(recipe.title)}</h1><p class="lead">${escapeHtml(recipe.description)}</p><div class="d-flex flex-wrap gap-4 my-4"><div><small class="text-muted d-block">Подготовка</small><strong>${recipe.prepTime} минут</strong></div><div><small class="text-muted d-block">Готовка</small><strong>${recipe.cookTime} минут</strong></div><div><small class="text-muted d-block">Порции</small><strong>${recipe.servings}</strong></div><div><small class="text-muted d-block">Сложность</small><strong>${escapeHtml(recipe.difficultyLabel)}</strong></div></div><button class="btn btn-primary ${saved ? 'active' : ''}" data-favorite-id="${escapeHtml(recipe.id)}"><i class="bi bi-heart${saved ? '-fill' : ''} me-2"></i>Сохранить</button></div></div>
        <div class="row g-5 mt-4"><div class="col-lg-5"><h2>Ингредиенты</h2><ul class="ingredient-list list-unstyled">${recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div class="col-lg-7"><h2>Как готовить</h2><ol class="step-list list-unstyled">${recipe.steps.map((step, index) => `<li class="d-flex gap-3"><span class="step-number">${index + 1}</span><span>${escapeHtml(step)}</span></li>`).join('')}</ol></div></div>
        <section class="mt-5"><div class="d-flex justify-content-between align-items-center"><h2>Комментарии</h2><span class="text-muted" data-comment-count>${comments.length}</span></div><form class="paper-card p-4 my-4" data-comment-form><label class="form-label" for="comment">Ваш комментарий</label><textarea class="form-control mb-3" id="comment" rows="3" required></textarea><button class="btn btn-primary" type="submit">Опубликовать</button></form><div data-comments>${comments.length ? comments.map(commentTemplate).join('') : '<p class="api-state empty">Комментариев пока нет. Будьте первым!</p>'}</div></section>`;

      const form = container.querySelector('[data-comment-form]');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const user = requireUser();
        if (!user) return;
        const textarea = form.querySelector('textarea');
        const text = textarea.value.trim();
        if (!text) return;
        const button = form.querySelector('button');
        button.disabled = true;
        try {
          const comment = await api('/comments', { method: 'POST', body: JSON.stringify({ recipeId: String(id), userId: String(user.id), author: `${user.name} ${user.surname}`, text, createdAt: new Date().toISOString() }) });
          const commentsNode = container.querySelector('[data-comments]');
          if (commentsNode.querySelector('.api-state')) commentsNode.innerHTML = '';
          commentsNode.insertAdjacentHTML('afterbegin', commentTemplate(comment));
          textarea.value = '';
          container.querySelector('[data-comment-count]').textContent = String(Number(container.querySelector('[data-comment-count]').textContent) + 1);
          notify('Комментарий опубликован');
        } catch (error) { notify(error.message); }
        finally { button.disabled = false; }
      });
    } catch (error) { showState(container, 'error', error.message); }
  }

  const commentTemplate = (comment) => `<div class="d-flex gap-3 py-3 border-bottom"><div class="author-avatar">${escapeHtml(comment.author.split(' ').map((part) => part[0]).join('').slice(0, 2))}</div><div><div><strong>${escapeHtml(comment.author)}</strong> <small class="text-muted">${new Date(comment.createdAt).toLocaleDateString('ru-RU')}</small></div><p class="mb-0 mt-1">${escapeHtml(comment.text)}</p></div></div>`;

  async function initProfile() {
    const user = requireUser();
    if (!user) return;
    document.querySelector('[data-profile-name]').textContent = `${user.name} ${user.surname}`;
    document.querySelector('[data-profile-meta]').textContent = `@${user.username || user.email.split('@')[0]} · ${user.city || 'Город не указан'}`;
    document.querySelector('[data-profile-bio]').textContent = user.bio || 'Описание пока не заполнено.';
    document.querySelector('[data-profile-avatar]').textContent = `${user.name[0]}${user.surname[0]}`.toUpperCase();
    const container = document.querySelector('[data-saved-recipes]');
    showState(container, 'loading', 'Загружаем сохранённые рецепты…');
    try {
      const favorites = await getFavorites();
      if (!favorites.length) return showState(container, 'empty', 'Сохранённых рецептов пока нет.');
      const recipes = await Promise.all(favorites.map((favorite) => api(`/recipes/${favorite.recipeId}`)));
      const ids = new Set(favorites.map((favorite) => String(favorite.recipeId)));
      container.innerHTML = recipes.map((recipe) => recipeCard(recipe, ids)).join('');
    } catch (error) { showState(container, 'error', error.message); }
  }

  function initLogin() {
    const form = document.querySelector('[data-login-form]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const data = await api('/login', { method: 'POST', body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value }) });
        session.save(data);
        notify('Вы успешно вошли');
        setTimeout(() => { location.href = 'profile.html'; }, 600);
      } catch (error) { notify(error.message === 'Cannot find user' ? 'Неверная почта или пароль' : error.message); }
      finally { button.disabled = false; }
    });
  }

  function initRegister() {
    const form = document.querySelector('[data-register-form]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const payload = { name: form.name.value.trim(), surname: form.surname.value.trim(), email: form.email.value.trim(), password: form.password.value, username: form.email.value.split('@')[0], city: '', bio: '' };
        const data = await api('/register', { method: 'POST', body: JSON.stringify(payload) });
        session.save(data);
        notify('Аккаунт создан');
        setTimeout(() => { location.href = 'profile.html'; }, 600);
      } catch (error) { notify(error.message.includes('Email') ? 'Пользователь с такой почтой уже существует' : error.message); }
      finally { button.disabled = false; }
    });
  }

  async function initCommunity() {
    const buttons = [...document.querySelectorAll('[data-follow]')];
    let follows = [];
    if (session.user) {
      try { follows = await api(`/follows?userId=${encodeURIComponent(session.user.id)}`); }
      catch (error) { notify(error.message); }
    }
    const updateButton = (button) => {
      const followed = follows.some((item) => String(item.authorId) === String(button.dataset.authorId));
      button.textContent = followed ? 'Вы подписаны' : 'Подписаться';
      button.classList.toggle('btn-primary', followed);
      button.classList.toggle('btn-outline-primary', !followed);
    };
    buttons.forEach((button) => {
      updateButton(button);
      button.addEventListener('click', async () => {
        const user = requireUser();
        if (!user) return;
        button.disabled = true;
        try {
          const match = follows.find((item) => String(item.authorId) === String(button.dataset.authorId));
          if (match) {
            await api(`/follows/${match.id}`, { method: 'DELETE' });
            follows = follows.filter((item) => item.id !== match.id);
            notify('Подписка отменена');
          } else {
            const created = await api('/follows', { method: 'POST', body: JSON.stringify({ userId: String(user.id), authorId: String(button.dataset.authorId) }) });
            follows.push(created);
            notify('Автор добавлен в подписки');
          }
          updateButton(button);
        } catch (error) { notify(error.message); }
        finally { button.disabled = false; }
      });
    });
  }

  updateAccountLinks();
  ({ home: initHome, search: initSearch, recipe: initRecipe, profile: initProfile, login: initLogin, register: initRegister, community: initCommunity }[page])?.();
});
