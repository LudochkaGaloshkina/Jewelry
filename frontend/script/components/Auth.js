export default {
    props: ['mode'],

    template: `
    <div class="auth-page">
        <header class="auth-header">
            <router-link class="brand" to="/">
                <img class="brand-logo" src="/logo.png" alt="Diamond Blackstar logo">
                <div class="brand-copy">
                    <span class="brand-name">Diamond Blackstar</span>
                    <span class="brand-tagline">Jewelry crafted with character</span>
                </div>
            </router-link>
        </header>

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
                            v-model="name"
                            type="text"
                            placeholder="Введите имя"
                            autocomplete="username"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Email</span>
                        <input
                            v-model="email"
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
                            autocomplete="current-password"
                        >
                    </label>

                    <button class="auth-submit" type="submit">
                        {{ isLogin ? 'Войти' : 'Зарегистрироваться' }}
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
    `
};
