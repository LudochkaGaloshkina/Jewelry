export default {
    props: {
        mode: {
            type: String,
            default: 'default'
        }
    },

    template: `
    <header class="site-header">
        <div class="header-tools">
            <router-link
                v-if="mode !== 'home'"
                class="tool-button"
                to="/"
            >
                На главную
            </router-link>
            <button
                v-else
                class="tool-button search-button"
                type="button"
                aria-label="Поиск"
            >
                <img
                    class="tool-icon-image"
                    src="/free-icon-magnifier-2319177.png"
                    alt=""
                >
                <span>Поиск</span>
            </button>
        </div>

        <router-link class="home-brand" to="/">
            <img class="home-logo" src="/logo.png" alt="Diamond Blackstar logo">
            <div class="home-brand-copy">
                <span class="home-brand-name">Diamond Blackstar</span>
                <span class="home-brand-tagline">Jewelry crafted with character</span>
            </div>
        </router-link>

        <div class="header-tools header-tools-right">
            <button
                v-if="mode === 'home'"
                class="tool-button cart-button"
                type="button"
                aria-label="Корзина"
            >
                <svg class="tool-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 5h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H7" />
                    <circle cx="10" cy="19" r="1.6" />
                    <circle cx="17" cy="19" r="1.6" />
                </svg>
                <span>Корзина</span>
            </button>

            <template v-if="currentUser">
                <router-link class="account-link account-name" to="/profile">
                    {{ currentUser.name }}
                </router-link>
                <button class="tool-button logout-button" type="button" @click="logout">
                    Выйти
                </button>
            </template>

            <router-link v-else class="account-link" to="/auth/login">
                Войти
            </router-link>
        </div>
    </header>
    `,

    data() {
        return {
            currentUser: null
        };
    },

    mounted() {
        this.loadCurrentUser();
        window.addEventListener('auth-changed', this.loadCurrentUser);
    },

    beforeUnmount() {
        window.removeEventListener('auth-changed', this.loadCurrentUser);
    },

    methods: {
        clearAuthCookie() {
            document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
        },

        loadCurrentUser() {
            try {
                const rawUser = sessionStorage.getItem('currentUser');
                this.currentUser = rawUser ? JSON.parse(rawUser) : null;
            } catch (err) {
                this.currentUser = null;
            }
        },

        async logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                // local cleanup is enough if the request fails
            }

            this.clearAuthCookie();
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            this.currentUser = null;
            window.dispatchEvent(new Event('auth-changed'));

            if (this.$route.meta.requiresAuth) {
                this.$router.push('/auth/login');
            }
        }
    }
};
