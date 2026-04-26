import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="home-page favorites-page">
        <app-header mode="profile"></app-header>

        <main class="home-content">
            <section class="favorites-hero">
                <div>
                    <p class="hero-kicker">Favorites</p>
                    <h1 class="profile-title">Избранные украшения</h1>
                </div>
            </section>

            <section class="collection-section favorites-section">
                <div class="catalog-meta favorites-meta">
                    <p class="catalog-count">
                        {{ isLoading ? 'Загрузка...' : 'Сохранено: ' + items.length }}
                    </p>
                    <router-link class="detail-link" to="/catalog">
                        Вернуться в каталог
                    </router-link>
                </div>

                <p v-if="errorMessage" class="collection-state collection-state-error">{{ errorMessage }}</p>
                <p v-else-if="isLoading" class="collection-state">Загружаем избранные товары...</p>
                <p v-else-if="items.length === 0" class="collection-state">
                    В избранном пока нет товаров.
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
                                <span v-if="item.isDiscounted" class="product-badge product-badge-discount">Скидка -{{ item.discountPercent }}%</span>
                                <span v-if="item.isPopular" class="product-badge">Популярное</span>
                            </div>
                            <h2 class="product-title">{{ item.title }}</h2>
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
                            </div>
                            <button
                                class="favorites-remove"
                                type="button"
                                :disabled="removingItemId === item.id"
                                @click="removeFavorite(item.id)"
                            >
                                {{ removingItemId === item.id ? 'Удаляем...' : 'Удалить из избранного' }}
                            </button>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    </div>
    `,

    data() {
        return {
            items: [],
            isLoading: false,
            errorMessage: '',
            removingItemId: null
        };
    },

    async mounted() {
        await this.loadFavorites();
    },

    methods: {
        clearAuthCookie() {
            document.cookie = 'authToken=; Path=/; Max-Age=0; SameSite=Lax';
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

        getDisplayPrice(item) {
            return item?.isDiscounted ? item.finalPrice : item?.price;
        },

        getApiErrorMessage(result, fallbackMessage) {
            const serverMessage = typeof result?.message === 'string' ? result.message.trim() : '';

            if (serverMessage) {
                return `${fallbackMessage} ${serverMessage}.`;
            }

            return fallbackMessage;
        },

        getAuthHeaders() {
            const token = sessionStorage.getItem('authToken');

            if (!token) {
                this.$router.replace('/auth/login');
                return null;
            }

            return {
                Authorization: `Bearer ${token}`
            };
        },

        async loadFavorites() {
            const headers = this.getAuthHeaders();

            if (!headers) {
                return;
            }

            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch('/api/users/me/favorites', {
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось загрузить избранные товары.');
                    return;
                }

                this.items = Array.isArray(result?.items) ? result.items : [];
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.clearAuthCookie();
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('currentUser');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось загрузить избранные товары. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.isLoading = false;
            }
        },

        async removeFavorite(itemId) {
            const headers = this.getAuthHeaders();

            if (!headers || this.removingItemId) {
                return;
            }

            this.removingItemId = itemId;
            this.errorMessage = '';

            try {
                const response = await fetch(`/api/users/me/favorites/${itemId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось удалить товар из избранного.');
                    return;
                }

                this.items = this.items.filter((item) => item.id !== itemId);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.clearAuthCookie();
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('currentUser');
                    this.$router.replace('/auth/login');
                    return;
                }

                this.errorMessage = 'Не удалось удалить товар из избранного. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.removingItemId = null;
            }
        }
    }
};
