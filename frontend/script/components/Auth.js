import AppHeader from './AppHeader.js';

export default {
    props: ['mode'],

    components: {
        AppHeader
    },

    template: `
    <div class="auth-page">
        <app-header mode="auth"></app-header>

        <section class="auth-shell">
            <div class="auth-copy">
                <p class="auth-kicker">Diamond Collection</p>
                <h1 class="auth-title">
                    {{ isLogin ? 'Добро пожаловать обратно' : 'Создайте аккаунт' }}
                </h1>
                <p class="auth-description">
                    {{ isLogin
                        ? 'Войдите, чтобы продолжить просмотр каталога, избранного и персональных подборок украшений.'
                        : 'Зарегистрируйтесь, чтобы сохранять изделия, оформлять заказы и получать персональные предложения.' }}
                </p>
            </div>

            <div class="auth-card">
                <div class="auth-tabs">
                    <router-link
                        class="auth-tab"
                        :class="{ 'is-active': isLogin }"
                        to="/auth/login"
                    >
                        Вход
                    </router-link>
                    <router-link
                        class="auth-tab"
                        :class="{ 'is-active': !isLogin }"
                        to="/auth/register"
                    >
                        Регистрация
                    </router-link>
                </div>

                <form class="auth-form" @submit.prevent="submit">
                    <label v-if="!isLogin" class="field">
                        <span class="field-label">Имя пользователя</span>
                        <input
                            v-model.trim="name"
                            type="text"
                            placeholder="Введите имя"
                            autocomplete="username"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Email</span>
                        <input
                            v-model.trim="email"
                            type="email"
                            placeholder="you@example.com"
                            autocomplete="email"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Пароль</span>
                        <input
                            v-model="password"
                            type="password"
                            placeholder="Введите пароль"
                            :autocomplete="isLogin ? 'current-password' : 'new-password'"
                        >
                    </label>

                    <button class="auth-submit" type="submit" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться') }}
                    </button>
                </form>

                <div class="auth-footer">
                    <router-link
                        v-if="isLogin"
                        class="auth-switch"
                        to="/auth/register"
                    >
                        Нет аккаунта? Зарегистрироваться
                    </router-link>
                    <router-link
                        v-else
                        class="auth-switch"
                        to="/auth/login"
                    >
                        Уже есть аккаунт? Войти
                    </router-link>

                    <p v-if="message" class="auth-message">{{ message }}</p>
                </div>
            </div>
        </section>
    </div>
    `,

    data() {
        return {
            name: '',
            email: '',
            password: '',
            message: '',
            isSubmitting: false
        };
    },

    computed: {
        isLogin() {
            return this.mode === 'login';
        }
    },

    methods: {
        persistAuthToken(token) {
            document.cookie = `authToken=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        },

        async submit() {
            if (this.isSubmitting) {
                return;
            }

            if (!this.email || !this.password || (!this.isLogin && !this.name)) {
                this.message = 'Заполните все поля.';
                return;
            }

            this.isSubmitting = true;
            this.message = '';

            try {
                const payload = this.isLogin
                    ? { email: this.email, password: this.password }
                    : { name: this.name, email: this.email, password: this.password };

                const endpoint = this.isLogin ? '/api/auth/login' : '/api/auth/register';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.message = result.message || 'Не удалось выполнить запрос.';
                    return;
                }

                this.persistAuthToken(result.token);
                sessionStorage.setItem('authToken', result.token);
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                window.dispatchEvent(new Event('auth-changed'));
                this.$router.push('/profile');
            } catch (err) {
                this.message = 'Ошибка соединения с сервером.';
            } finally {
                this.isSubmitting = false;
            }
        }
    }
};
