import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page admin-page">
        <app-header mode="admin"></app-header>

        <main class="home-content admin-content">
            <section class="favorites-hero">
                <div>
                    <p class="hero-kicker">Admin</p>
                    <h1 class="profile-title">Панель администратора</h1>
                </div>
            </section>

            <section v-if="accessMessage" class="collection-section">
                <p class="collection-state collection-state-error">{{ accessMessage }}</p>
            </section>

            <section v-else class="admin-layout">
                <aside class="admin-sidebar">
                    <button
                        type="button"
                        class="admin-nav-button"
                        :class="{ 'is-active': activeSection === 'items' }"
                        @click="activeSection = 'items'"
                    >
                        Управление товарами
                    </button>
                    <button
                        type="button"
                        class="admin-nav-button"
                        :class="{ 'is-active': activeSection === 'users' }"
                        @click="activeSection = 'users'"
                    >
                        Управление пользователями
                    </button>
                </aside>

                <section v-if="activeSection === 'items'" class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <p class="hero-kicker">Items</p>
                            <h2 class="collection-title">Товары</h2>
                        </div>
                        <button class="detail-link admin-add-button" type="button" @click="startCreateItem">
                            Добавить товар
                        </button>
                    </div>

                    <form v-if="isItemFormVisible" class="admin-form" @submit.prevent="saveItem">
                        <label class="field">
                            <span class="field-label">Название</span>
                            <input v-model.trim="itemForm.title" type="text" placeholder="Название товара">
                        </label>
                        <label class="field">
                            <span class="field-label">Категория</span>
                            <select v-model="itemForm.category">
                                <option value="">Выберите категорию</option>
                                <option v-for="category in categories" :key="category" :value="category">
                                    {{ getCategoryLabel(category) }}
                                </option>
                            </select>
                        </label>
                        <label class="field">
                            <span class="field-label">Цена</span>
                            <input v-model.number="itemForm.price" type="number" min="0" step="1" placeholder="0">
                        </label>
                        <label class="field">
                            <span class="field-label">Скидка, %</span>
                            <input v-model.number="itemForm.discount" type="number" min="0" max="100" step="1" placeholder="0">
                        </label>
                        <label class="field admin-form-wide">
                            <span class="field-label">Изображение</span>
                            <input v-model.trim="itemForm.imageUrl" type="text" placeholder="/images/items/example.svg">
                        </label>
                        <label class="field admin-form-wide">
                            <span class="field-label">Описание</span>
                            <textarea v-model.trim="itemForm.description" rows="4" placeholder="Описание товара"></textarea>
                        </label>
                        <label class="catalog-toggle admin-form-wide">
                            <input v-model="itemForm.isPopular" type="checkbox">
                            <span>Популярный товар</span>
                        </label>

                        <div class="admin-form-actions admin-form-wide">
                            <button class="profile-submit admin-submit" type="submit" :disabled="isSavingItem">
                                {{ isSavingItem ? 'Сохраняем...' : 'Сохранить товар' }}
                            </button>
                            <button class="favorites-remove" type="button" @click="cancelItemForm">
                                Отмена
                            </button>
                        </div>
                    </form>

                    <p v-if="itemsMessage" class="profile-message">{{ itemsMessage }}</p>
                    <p v-if="isItemsLoading" class="collection-state">Загружаем товары...</p>

                    <div v-else class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Цена</th>
                                    <th>Скидка</th>
                                    <th>Дата добавления</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="item in items" :key="item.id">
                                    <td>
                                        <strong>{{ item.title }}</strong>
                                        <span>{{ getCategoryLabel(item.category) }}</span>
                                    </td>
                                    <td>{{ formatPrice(item.price) }}</td>
                                    <td>{{ Number(item.discountPercent || item.discount || 0) }}%</td>
                                    <td>{{ formatDate(item.createdAt) }}</td>
                                    <td>
                                        <div class="admin-actions-cell">
                                            <button class="favorites-remove" type="button" @click="startEditItem(item)">
                                                Редактировать
                                            </button>
                                            <button class="favorites-remove admin-danger" type="button" @click="deleteItem(item)">
                                                Удалить
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="items.length === 0">
                                    <td colspan="5">Товары не найдены.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section v-else class="admin-panel">
                    <div class="admin-panel-head">
                        <div>
                            <p class="hero-kicker">Users</p>
                            <h2 class="collection-title">Пользователи</h2>
                        </div>
                    </div>

                    <p v-if="usersMessage" class="profile-message">{{ usersMessage }}</p>
                    <p v-if="isUsersLoading" class="collection-state">Загружаем пользователей...</p>

                    <div v-else class="admin-table-wrap">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Пользователь</th>
                                    <th>Email</th>
                                    <th>Секретное слово</th>
                                    <th>Роль</th>
                                    <th>Дата регистрации</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="user in users" :key="user.id">
                                    <td>
                                        <strong>{{ user.name }}</strong>
                                    </td>
                                    <td>{{ user.email }}</td>
                                    <td>
                                        <span class="admin-secret-status">
                                            {{ getSecretWordText(user) }}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            class="admin-role-select"
                                            :value="user.role"
                                            :disabled="user.id === currentUser?.id"
                                            @change="updateUserRole(user, $event.target.value)"
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td>{{ formatDate(user.createdAt) }}</td>
                                    <td>
                                        <div class="admin-actions-cell">
                                            <button
                                                class="favorites-remove admin-danger"
                                                type="button"
                                                :disabled="user.id === currentUser?.id"
                                                @click="deleteUser(user)"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="users.length === 0">
                                    <td colspan="6">Пользователи не найдены.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        </main>
    </div>
    `,

    data() {
        return {
            currentUser: null,
            accessMessage: '',
            activeSection: 'items',
            categories: ['Rings', 'Earrings', 'Bracelets', 'Necklaces', 'Pendants'],
            items: [],
            users: [],
            isItemsLoading: false,
            isUsersLoading: false,
            isSavingItem: false,
            isItemFormVisible: false,
            editingItemId: null,
            itemsMessage: '',
            usersMessage: '',
            itemForm: this.getEmptyItemForm()
        };
    },

    async mounted() {
        const isAllowed = await this.loadAdminProfile();

        if (!isAllowed) {
            return;
        }

        await Promise.all([
            this.loadItems(),
            this.loadUsers()
        ]);
    },

    methods: {
        getEmptyItemForm() {
            return {
                title: '',
                description: '',
                price: 0,
                discount: 0,
                imageUrl: '',
                category: '',
                isPopular: false
            };
        },

        getAuthHeaders() {
            const token = sessionStorage.getItem('authToken');

            return {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            };
        },

        clearAuthCookie() {
            document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
        },

        async loadAdminProfile() {
            const token = sessionStorage.getItem('authToken');

            if (!token) {
                this.$router.replace('/auth/login');
                return false;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    throw new Error('Unauthorized');
                }

                if (result.user.role !== 'admin') {
                    this.accessMessage = 'Эта страница доступна только администратору.';
                    return false;
                }

                this.currentUser = result.user;
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                window.dispatchEvent(new Event('auth-changed'));
                return true;
            } catch (err) {
                this.clearAuthCookie();
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('currentUser');
                this.$router.replace('/auth/login');
                return false;
            }
        },

        getCategoryLabel(category) {
            const labels = {
                Rings: 'Кольца',
                Earrings: 'Серьги',
                Bracelets: 'Браслеты',
                Necklaces: 'Колье',
                Pendants: 'Подвески'
            };

            return labels[category] || category;
        },

        formatPrice(value) {
            const amount = Number(value);

            if (Number.isNaN(amount)) {
                return value;
            }

            return new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'BYN',
                maximumFractionDigits: 0
            }).format(amount);
        },

        formatDate(value) {
            if (!value) {
                return 'Не указана';
            }

            return new Date(value).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        getSecretWordText(user) {
            return user.hasSecretWord ? 'Задано' : 'Не задано';
        },

        async loadItems() {
            this.isItemsLoading = true;
            this.itemsMessage = '';

            try {
                const response = await fetch('/api/items?sort=popular');
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.itemsMessage = result?.message || 'Не удалось загрузить товары.';
                    return;
                }

                this.items = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.itemsMessage = 'Ошибка соединения с сервером.';
            } finally {
                this.isItemsLoading = false;
            }
        },

        async loadUsers() {
            this.isUsersLoading = true;
            this.usersMessage = '';

            try {
                const response = await fetch('/api/admin/users', {
                    credentials: 'include',
                    headers: this.getAuthHeaders()
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.usersMessage = result?.message || 'Не удалось загрузить пользователей.';
                    return;
                }

                this.users = Array.isArray(result.users) ? result.users : [];
            } catch (err) {
                this.usersMessage = 'Ошибка соединения с сервером.';
            } finally {
                this.isUsersLoading = false;
            }
        },

        startCreateItem() {
            this.editingItemId = null;
            this.itemForm = this.getEmptyItemForm();
            this.isItemFormVisible = true;
            this.itemsMessage = '';
        },

        startEditItem(item) {
            this.editingItemId = item.id;
            this.itemForm = {
                title: item.title || '',
                description: item.description || '',
                price: Number(item.price) || 0,
                discount: Number(item.discountPercent || item.discount || 0),
                imageUrl: item.imageUrl || '',
                category: item.category || '',
                isPopular: Boolean(item.isPopular)
            };
            this.isItemFormVisible = true;
            this.itemsMessage = '';
        },

        cancelItemForm() {
            this.isItemFormVisible = false;
            this.editingItemId = null;
            this.itemForm = this.getEmptyItemForm();
        },

        validateItemForm() {
            if (!this.itemForm.title || !this.itemForm.description || !this.itemForm.category) {
                return 'Заполните название, описание и категорию.';
            }

            if (Number.isNaN(Number(this.itemForm.price)) || Number(this.itemForm.price) < 0) {
                return 'Укажите корректную цену.';
            }

            if (
                Number.isNaN(Number(this.itemForm.discount))
                || Number(this.itemForm.discount) < 0
                || Number(this.itemForm.discount) > 100
            ) {
                return 'Скидка должна быть от 0 до 100.';
            }

            return '';
        },

        async saveItem() {
            if (this.isSavingItem) {
                return;
            }

            const validationMessage = this.validateItemForm();

            if (validationMessage) {
                this.itemsMessage = validationMessage;
                return;
            }

            this.isSavingItem = true;
            this.itemsMessage = '';

            const isEdit = this.editingItemId !== null;
            const endpoint = isEdit ? `/api/items/${this.editingItemId}` : '/api/items';

            try {
                const response = await fetch(endpoint, {
                    method: isEdit ? 'PUT' : 'POST',
                    credentials: 'include',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(this.itemForm)
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.itemsMessage = result?.message || 'Не удалось сохранить товар.';
                    return;
                }

                this.itemsMessage = isEdit ? 'Товар обновлен.' : 'Товар добавлен.';
                this.cancelItemForm();
                await this.loadItems();
            } catch (err) {
                this.itemsMessage = 'Ошибка соединения с сервером.';
            } finally {
                this.isSavingItem = false;
            }
        },

        async deleteItem(item) {
            const confirmed = window.confirm(`Удалить товар "${item.title}"?`);

            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(`/api/items/${item.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: this.getAuthHeaders()
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.itemsMessage = result?.message || 'Не удалось удалить товар.';
                    return;
                }

                this.itemsMessage = 'Товар удален.';
                await this.loadItems();
            } catch (err) {
                this.itemsMessage = 'Ошибка соединения с сервером.';
            }
        },

        async updateUserRole(user, role) {
            this.usersMessage = '';

            try {
                const response = await fetch(`/api/admin/users/${user.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify({ role })
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.usersMessage = result?.message || 'Не удалось обновить роль.';
                    await this.loadUsers();
                    return;
                }

                this.usersMessage = 'Роль пользователя обновлена.';
                await this.loadUsers();
            } catch (err) {
                this.usersMessage = 'Ошибка соединения с сервером.';
                await this.loadUsers();
            }
        },

        async deleteUser(user) {
            const confirmed = window.confirm(`Удалить пользователя "${user.name}"?`);

            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(`/api/admin/users/${user.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: this.getAuthHeaders()
                });
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.usersMessage = result?.message || 'Не удалось удалить пользователя.';
                    return;
                }

                this.usersMessage = 'Пользователь удален.';
                await this.loadUsers();
            } catch (err) {
                this.usersMessage = 'Ошибка соединения с сервером.';
            }
        }
    }
};
