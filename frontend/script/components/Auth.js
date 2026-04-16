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

                    <label v-if="!isLogin" class="field">
                        <span class="field-label">Повторите пароль</span>
                        <input
                            v-model="confirmPassword"
                            type="password"
                            placeholder="Повторите пароль"
                            autocomplete="new-password"
                        >
                    </label>

                    <label v-if="!isLogin" class="field">
                        <span class="field-label">Секретное слово</span>
                        <input
                            v-model.trim="secretWord"
                            type="text"
                            placeholder="Например, девичья фамилия матери"
                            autocomplete="off"
                        >
                    </label>

                    <button class="auth-submit" type="submit" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Подождите...' : (isLogin ? 'Войти' : 'Зарегистрироваться') }}
                    </button>
                </form>

                <form
                    v-if="isLogin && isRecoveryVisible"
                    class="auth-form auth-recovery-form"
                    @submit.prevent="submitPasswordReset"
                >
                    <label class="field">
                        <span class="field-label">Email</span>
                        <input
                            v-model.trim="recoveryEmail"
                            type="email"
                            placeholder="you@example.com"
                            autocomplete="email"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Секретное слово</span>
                        <input
                            v-model.trim="recoverySecretWord"
                            type="text"
                            placeholder="Введите секретное слово"
                            autocomplete="off"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Новый пароль</span>
                        <input
                            v-model="recoveryPassword"
                            type="password"
                            placeholder="Минимум 6 символов"
                            autocomplete="new-password"
                        >
                    </label>

                    <button class="auth-submit" type="submit" :disabled="isRecoverySubmitting">
                        {{ isRecoverySubmitting ? 'Подождите...' : 'Сбросить пароль' }}
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

                    <button
                        v-if="isLogin"
                        class="auth-toggle"
                        type="button"
                        @click="toggleRecovery"
                    >
                        {{ isRecoveryVisible ? 'Вспомнили пароль?' : 'Забыли пароль?' }}
                    </button>

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
            confirmPassword: '',
            secretWord: '',
            recoveryEmail: '',
            recoverySecretWord: '',
            recoveryPassword: '',
            message: '',
            isSubmitting: false,
            isRecoverySubmitting: false,
            isRecoveryVisible: false
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

        toggleRecovery() {
            this.isRecoveryVisible = !this.isRecoveryVisible;
            this.message = '';
            this.recoveryEmail = this.email;
        },

        getPasswordValidationError(password) {
            if (password.length < 8) {
                return 'Пароль должен быть не короче 8 символов.';
            }

            if (!/[a-z]/.test(password)) {
                return 'Пароль должен содержать хотя бы одну строчную латинскую букву.';
            }

            if (!/[A-Z]/.test(password)) {
                return 'Пароль должен содержать хотя бы одну заглавную латинскую букву.';
            }

            if (!/\d/.test(password)) {
                return 'Пароль должен содержать хотя бы одну цифру.';
            }

            return '';
        },

        async submit() {
            if (this.isSubmitting) {
                return;
            }

            if (!this.email || !this.password || (!this.isLogin && (!this.name || !this.secretWord || !this.confirmPassword))) {
                this.message = 'Заполните все поля.';
                return;
            }

            if (!this.isLogin) {
                const passwordValidationError = this.getPasswordValidationError(this.password);

                if (passwordValidationError) {
                    this.message = passwordValidationError;
                    return;
                }

                if (this.password !== this.confirmPassword) {
                    this.message = 'Пароли не совпадают.';
                    return;
                }
            }

            this.isSubmitting = true;
            this.message = '';

            try {
                const payload = this.isLogin
                    ? { email: this.email, password: this.password }
                    : {
                        name: this.name,
                        email: this.email,
                        password: this.password,
                        confirmPassword: this.confirmPassword,
                        secretWord: this.secretWord
                    };

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
        },

        async submitPasswordReset() {
            if (this.isRecoverySubmitting) {
                return;
            }

            if (!this.recoveryEmail || !this.recoverySecretWord || !this.recoveryPassword) {
                this.message = 'Для восстановления заполните все поля.';
                return;
            }

            this.isRecoverySubmitting = true;
            this.message = '';

            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: this.recoveryEmail,
                        secretWord: this.recoverySecretWord,
                        newPassword: this.recoveryPassword
                    })
                });

                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.message = result.message || 'Не удалось восстановить пароль.';
                    return;
                }

                this.message = result.message;
                this.password = '';
                this.recoveryPassword = '';
                this.recoverySecretWord = '';
                this.email = this.recoveryEmail;
                this.isRecoveryVisible = false;
            } catch (err) {
                this.message = 'Ошибка соединения с сервером.';
            } finally {
                this.isRecoverySubmitting = false;
            }
        }
    }
};
