import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page profile-page">
        <app-header mode="profile"></app-header>

        <main class="home-content">
            <section class="profile-card" v-if="user">
                <p class="hero-kicker">Private Zone</p>
                <h1 class="profile-title">Личный кабинет</h1>
                <div class="profile-grid">
                    <div class="profile-item">
                        <span class="profile-label">Имя</span>
                        <span class="profile-value">{{ user.name }}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Email</span>
                        <span class="profile-value">{{ user.email }}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Роль</span>
                        <span class="profile-value">{{ user.role }}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Дата регистрации</span>
                        <span class="profile-value">{{ formatDate(user.createdAt) }}</span>
                    </div>
                    <div class="profile-item">
                        <span class="profile-label">Восстановление пароля</span>
                        <span class="profile-value">
                            {{ user.hasSecretWord ? 'Секретное слово установлено' : 'Секретное слово ещё не задано' }}
                        </span>
                    </div>
                </div>

                <form class="profile-form" @submit.prevent="saveSecretWord">
                    <label class="field">
                        <span class="field-label">
                            {{ user.hasSecretWord ? 'Новое секретное слово' : 'Секретное слово' }}
                        </span>
                        <input
                            v-model.trim="secretWord"
                            type="text"
                            placeholder="Минимум 3 символа"
                            autocomplete="off"
                        >
                    </label>

                    <button class="profile-submit" type="submit" :disabled="isSavingSecretWord">
                        {{ isSavingSecretWord ? 'Сохраняем...' : (user.hasSecretWord ? 'Обновить секретное слово' : 'Сохранить секретное слово') }}
                    </button>
                </form>

                <p v-if="message" class="profile-message">{{ message }}</p>
            </section>
        </main>
    </div>
    `,

    data() {
        return {
            user: null,
            secretWord: '',
            message: '',
            isSavingSecretWord: false
        };
    },

    async mounted() {
        await this.loadProfile();
    },

    methods: {
        clearAuthCookie() {
            document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
        },

        async loadProfile() {
            const token = sessionStorage.getItem('authToken');

            if (!token) {
                this.$router.replace('/auth/login');
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    throw new Error('Unauthorized');
                }

                this.user = result.user;
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            } catch (err) {
                this.clearAuthCookie();
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('currentUser');
                this.$router.replace('/auth/login');
            }
        },

        formatDate(value) {
            return new Date(value).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        async saveSecretWord() {
            if (this.isSavingSecretWord) {
                return;
            }

            if (!this.secretWord) {
                this.message = 'Введите секретное слово.';
                return;
            }

            const token = sessionStorage.getItem('authToken');

            if (!token) {
                this.$router.replace('/auth/login');
                return;
            }

            this.isSavingSecretWord = true;
            this.message = '';

            try {
                const response = await fetch('/api/auth/me/secret-word', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        secretWord: this.secretWord
                    })
                });

                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.message = result.message || 'Не удалось сохранить секретное слово.';
                    return;
                }

                this.user = result.user;
                this.secretWord = '';
                this.message = result.message;
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            } catch (err) {
                this.message = 'Ошибка соединения с сервером.';
            } finally {
                this.isSavingSecretWord = false;
            }
        }
    }
};
