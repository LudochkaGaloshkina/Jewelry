import AppHeader from './AppHeader.js';
import AppFooter from './AppFooter.js';
import { getApiErrorMessage, getNetworkErrorMessage } from '../apiErrors.js';

export default {
    components: {
        AppHeader,
        AppFooter
    },

    template: `
    <div class="home-page discount-page">
        <app-header mode="catalog"></app-header>

        <main class="home-content">
            <section class="favorites-hero">
                <div>
                    <p class="hero-kicker">Special Offers</p>
                    <h1 class="profile-title">Украшения со скидкой</h1>
                </div>
                <p class="profile-description">
                    Актуальные акцентные предложения Diamond Blackstar с выгодной ценой прямо сейчас.
                </p>
            </section>

            <section class="collection-section favorites-section">
                <div class="catalog-meta favorites-meta">
                    <p class="catalog-count">
                        {{ isLoading ? 'Загрузка...' : 'Предложений: ' + items.length }}
                    </p>
                    <router-link class="detail-link" to="/catalog">
                        Открыть весь каталог
                    </router-link>
                </div>

                <p v-if="errorMessage" class="collection-state collection-state-error">{{ errorMessage }}</p>
                <p v-else-if="isLoading" class="collection-state">Подбираем актуальные скидки...</p>
                <p v-else-if="items.length === 0" class="collection-state">
                    Сейчас скидочных предложений нет.
                </p>

                <div v-else class="collection-grid catalog-grid">
                    <article
                        v-for="item in items"
                        :key="item.id"
                        class="product-card"
                    >
                        <div class="product-media">
                            <img :src="item.imageUrl" :alt="item.title">
                        </div>
                        <div class="product-body">
                            <div class="product-meta">
                                <span class="product-category">{{ getCategoryLabel(item.category) }}</span>
                                <span class="product-badge product-badge-discount">Скидка -{{ item.discountPercent }}%</span>
                            </div>
                            <h2 class="product-title">{{ item.title }}</h2>
                            <p class="product-description">{{ item.description }}</p>
                            <div class="product-footer product-footer-actions">
                                <div class="product-price-group">
                                    <strong class="product-price">{{ formatPrice(item.finalPrice) }}</strong>
                                    <span class="product-price-old">{{ formatPrice(item.originalPrice) }}</span>
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
        <app-footer></app-footer>
    </div>
    `,

    data() {
        return {
            items: [],
            isLoading: false,
            errorMessage: '',
            addingCartItemId: null,
            cartMessage: ''
        };
    },

    mounted() {
        this.loadDiscountItems();
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

        async loadDiscountItems() {
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch('/api/items?discount=true');
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = getApiErrorMessage(result, 'Не удалось загрузить скидочные товары.', response);
                    return;
                }

                this.items = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.errorMessage = getNetworkErrorMessage('Не удалось загрузить скидочные товары.');
            } finally {
                this.isLoading = false;
            }
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
        }
    }
};
