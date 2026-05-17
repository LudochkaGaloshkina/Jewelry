export default {
    props: {
        mode: {
            type: String,
            default: 'default'
        }
    },

    template: `
    <header class="site-header" :class="{ 'is-menu-open': isMenuOpen }">
        <router-link class="home-brand" to="/" @click="closeMenu">
            <img class="home-logo" src="/logo.png" alt="Diamond Blackstar logo">
            <div class="home-brand-copy">
                <span class="home-brand-name">Diamond Blackstar</span>
                <span class="home-brand-tagline">Jewelry crafted with character</span>
            </div>
        </router-link>

        <button
            class="mobile-menu-toggle"
            type="button"
            :aria-expanded="isMenuOpen ? 'true' : 'false'"
            :aria-label="isMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
            @click="toggleMenu"
        >
            <span></span>
            <span></span>
            <span></span>
        </button>

        <div class="header-menu" :class="{ 'is-open': isMenuOpen }">
            <div class="header-tools">
                <router-link class="tool-button" to="/" @click="closeMenu">
                    На главную
                </router-link>
                <router-link
                    class="tool-button search-button"
                    to="/catalog"
                    aria-label="Каталог"
                    @click="closeMenu"
                >
                    <img
                        class="tool-icon-image"
                        src="/wedding-gift_17153035.png"
                        alt=""
                    >
                    <span>Каталог</span>
                </router-link>
                <router-link class="tool-button discount-link" to="/discount" @click="closeMenu">
                    <span class="discount-link-mark">%</span>
                    <span>Скидки</span>
                </router-link>
            </div>

            <div class="header-tools header-tools-right">
                <router-link
                    class="tool-button cart-button"
                    to="/cart"
                    aria-label="Корзина"
                    @click="closeMenu"
                >
                    <svg class="tool-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 5h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H7" />
                        <circle cx="10" cy="19" r="1.6" />
                        <circle cx="17" cy="19" r="1.6" />
                    </svg>
                    <span>Корзина</span>
                </router-link>

                <template v-if="currentUser">
                    <router-link
                        v-if="currentUser.role === 'admin'"
                        class="tool-button admin-header-link"
                        to="/admin"
                        @click="closeMenu"
                    >
                        Admin
                    </router-link>
                    <router-link class="account-link account-name" to="/profile" @click="closeMenu">
                        {{ currentUser.name }}
                    </router-link>
                    <button class="tool-button logout-button" type="button" @click="logout">
                        Выйти
                    </button>
                </template>

                <router-link v-else class="account-link" to="/auth/login" @click="closeMenu">
                    Войти
                </router-link>
            </div>
        </div>
    </header>
    `,

    data() {
        return {
            isMenuOpen: false
        };
    },

    computed: {
        currentUser() {
            return this.$store.state.user;
        }
    },

    watch: {
        '$route.fullPath'() {
            this.closeMenu();
        }
    },

    mounted() {
        if (this.$store.getters.isAuthenticated && !this.currentUser) {
            this.$store.dispatch('refreshUser');
        }
    },

    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        },

        closeMenu() {
            this.isMenuOpen = false;
        },

        async logout() {
            await this.$store.dispatch('logout');
            this.closeMenu();

            if (this.$route.meta.requiresAuth) {
                this.$router.push('/auth/login');
            }
        }
    }
};
