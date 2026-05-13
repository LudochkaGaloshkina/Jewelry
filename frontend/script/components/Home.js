import AppHeader from './AppHeader.js';
import { getApiErrorMessage, getNetworkErrorMessage } from '../apiErrors.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page">
        <app-header mode="home"></app-header>

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

            <section class="collection-section">
                <div class="collection-heading">
                    <div>
                        <p class="hero-kicker">Популярное</p>
                        <h2 class="collection-title">Украшения, которые сейчас выбирают чаще всего</h2>
                    </div>
                </div>

                <p v-if="itemsError" class="collection-state collection-state-error">{{ itemsError }}</p>
                <p v-else-if="isItemsLoading" class="collection-state">Загружаем подборку украшений...</p>

                <div v-else class="collection-grid">
                    <article
                        v-for="item in popularItems"
                        :key="item.id"
                        class="product-card"
                    >
                        <div class="product-media">
                                <img :src="item.imageUrl" :alt="item.title">
                            </div>
                            <div class="product-body">
                                <div class="product-meta">
                                    <span class="product-category">{{ getCategoryLabel(item.category) }}</span>
                                    <span v-if="item.isDiscounted" class="product-badge product-badge-discount">Скидка -{{ item.discountPercent }}%</span>
                                    <span v-if="item.isPopular" class="product-badge">Популярное</span>
                                </div>
                                <h3 class="product-title">{{ item.title }}</h3>
                                <p class="product-description">{{ item.description }}</p>
                                <div class="product-footer product-footer-actions">
                                    <div class="product-price-group">
                                        <strong class="product-price">{{ formatPrice(getDisplayPrice(item)) }}</strong>
                                        <span v-if="item.isDiscounted" class="product-price-old">{{ formatPrice(item.originalPrice) }}</span>
                                    </div>
                                    <router-link
                                        class="detail-link"
                                        :to="'/catalog/' + item.id"
                                    >
                                        Подробнее
                                    </router-link>
                                    <button
                                        class="detail-link product-add-cart"
                                        type="button"
                                        :disabled="addingCartItemId === item.id"
                                        @click="addToCart(item)"
                                    >
                                        {{ addingCartItemId === item.id ? 'Добавляем...' : 'В корзину' }}
                                    </button>
                                </div>
                            </div>
                    </article>
                </div>

                <p v-if="cartMessage" class="item-note">{{ cartMessage }}</p>
            </section>
        </main>
    </div>
    `,

    mounted() {
        this.setupSlider();
        this.startAutoSlide();
        this.loadPopularItems();
        window.addEventListener('resize', this.handleResize);
    },

    beforeUnmount() {
        this.stopAutoSlide();
        window.removeEventListener('resize', this.handleResize);
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
            popularItems: [],
            isItemsLoading: false,
            itemsError: '',
            addingCartItemId: null,
            cartMessage: ''
        };
    },

    methods: {
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

        async loadPopularItems() {
            this.isItemsLoading = true;
            this.itemsError = '';

            try {
                const response = await fetch('/api/items?popular=true');
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.popularItems = [];
                    this.itemsError = getApiErrorMessage(result, 'Не удалось загрузить товары.', response);
                    return;
                }

                this.popularItems = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.popularItems = [];
                this.itemsError = getNetworkErrorMessage('Не удалось загрузить товары.');
            } finally {
                this.isItemsLoading = false;
            }
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

        getDisplayPrice(item) {
            return item?.isDiscounted ? item.finalPrice : item?.price;
        },

        async addToCart(item) {
            if (!item || this.addingCartItemId) {
                return;
            }

            const headers = this.$store.getters.jsonAuthHeaders;

            if (!headers) {
                this.$router.push('/auth/login');
                return;
            }

            this.addingCartItemId = item.id;
            this.cartMessage = '';

            try {
                const response = await fetch(`/api/users/me/cart/${item.id}`, {
                    method: 'POST',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ quantity: 1 })
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.cartMessage = getApiErrorMessage(result, 'Не удалось добавить товар в корзину.', response);
                    return;
                }

                this.cartMessage = `${item.title} добавлен в корзину.`;
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.push('/auth/login');
                    return;
                }

                this.cartMessage = getNetworkErrorMessage('Не удалось добавить товар в корзину.');
            } finally {
                this.addingCartItemId = null;
            }
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

        handleResize() {
            this.update();
        },

        update() {
            const slider = this.$refs.slider;

            if (!slider) {
                return;
            }

            const width = slider.clientWidth;
            slider.style.transform = `translateX(-${this.currentIndex * width}px)`;
        }
    }
};
