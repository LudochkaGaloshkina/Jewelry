export default {
    template: `
    <div class="home-page">
        <header class="site-header">
            <div class="header-tools">
                <button class="tool-button search-button" type="button" aria-label="Поиск">
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
                <button class="tool-button cart-button" type="button" aria-label="Корзина">
                    <svg class="tool-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 5h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.76L20 8H7" />
                        <circle cx="10" cy="19" r="1.6" />
                        <circle cx="17" cy="19" r="1.6" />
                    </svg>
                    <span>Корзина</span>
                </button>
                <router-link
                    v-if="!currentUserName"
                    class="account-link"
                    to="/auth/login"
                >
                    Войти
                </router-link>
                <div v-else class="account-panel">
                    <span class="account-link account-name">{{ currentUserName }}</span>
                    <button class="tool-button logout-button" type="button" @click="logout">
                        Выйти
                    </button>
                </div>
            </div>
        </header>

        <main class="home-content">
            <section class="hero-copy">
                <p class="hero-kicker">Premium Jewelry House</p>
                <h1 class="hero-title">Украшения с характером и блеском ночного золота</h1>
                <p class="hero-description">
                    Откройте коллекцию Diamond Blackstar: выразительные формы, глубокий
                    блеск металла и украшения, которые хочется запоминать.
                </p>
            </section>

            <section class="slider-card">
                <div class="slider-meta">
                    <span class="slider-badge">Featured Selection</span>
                    <span class="slider-count">
                        {{ String(currentIndex + 1).padStart(2, '0') }} / {{ String(images.length).padStart(2, '0') }}
                    </span>
                </div>

                <div class="roundabound">
                    <div class="slider" ref="slider"></div>
                    <button class="prev" @click="prev" aria-label="Предыдущий слайд">◄</button>
                    <button class="next" @click="next" aria-label="Следующий слайд">►</button>
                </div>
            </section>
        </main>
    </div>
    `,

    mounted() {
        this.loadCurrentUser();
        this.setupSlider();
        this.startAutoSlide();
        window.addEventListener('auth-changed', this.loadCurrentUser);
    },

    beforeUnmount() {
        this.stopAutoSlide();
        window.removeEventListener('auth-changed', this.loadCurrentUser);
    },

    data() {
        return {
            images: [
                '/script/Денис.jpg',
                '/script/Пашка.jpg',
                '/script/Вероника.jpg',
                '/script/Дима.jpg'
            ],
            currentIndex: 0,
            autoSlideId: null,
            currentUserName: ''
        };
    },

    methods: {
        clearAuthCookie() {
            document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
        },

        async loadCurrentUser() {
            const token = sessionStorage.getItem('authToken');

            if (!token) {
                this.clearAuthCookie();
                this.currentUserName = '';
                sessionStorage.removeItem('currentUser');
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

                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                this.currentUserName = result.user.name || '';
            } catch (err) {
                this.clearAuthCookie();
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('currentUser');
                this.currentUserName = '';
            }
        },

        async logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (err) {
                // logout should still clear local session even if the request fails
            }

            this.clearAuthCookie();
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('currentUser');
            this.currentUserName = '';
            window.dispatchEvent(new Event('auth-changed'));
        },

        setupSlider() {
            const slider = this.$refs.slider;

            slider.innerHTML = '';

            this.images.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.classList.add('image');
                slider.appendChild(img);
            });

            this.update();
        },

        startAutoSlide() {
            this.stopAutoSlide();
            this.autoSlideId = setInterval(() => {
                this.next();
            }, 4000);
        },

        stopAutoSlide() {
            if (this.autoSlideId) {
                clearInterval(this.autoSlideId);
                this.autoSlideId = null;
            }
        },

        next() {
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this.update();
        },

        prev() {
            this.currentIndex =
                (this.currentIndex - 1 + this.images.length) % this.images.length;
            this.update();
        },

        update() {
            const slider = this.$refs.slider;
            const width = slider.clientWidth;
            slider.style.transform = `translateX(-${this.currentIndex * width}px)`;
        }
    }
};
