import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="item-page">
        <app-header mode="catalog"></app-header>

        <main class="home-content">
            <p v-if="isLoading" class="collection-state">Загружаем карточку украшения...</p>
            <p v-else-if="errorMessage" class="collection-state collection-state-error">{{ errorMessage }}</p>

            <template v-else-if="item">
                <section class="item-breadcrumbs">
                    <router-link to="/catalog">Каталог</router-link>
                    <span>/</span>
                    <span>{{ item.title }}</span>
                </section>

                <section class="item-details-card">
                    <div class="item-gallery">
                        <div class="item-media">
                            <img :src="item.imageUrl" :alt="item.title">
                        </div>
                    </div>

                    <div class="item-summary">
                        <div class="product-meta">
                            <span class="product-category">{{ getCategoryLabel(item.category) }}</span>
                            <span v-if="item.isDiscounted" class="product-badge product-badge-discount">Скидка -{{ item.discountPercent }}%</span>
                            <span v-if="item.isPopular" class="product-badge">Популярное</span>
                        </div>

                        <div class="item-headline">
                            <p class="hero-kicker">Карточка товара</p>
                            <h1 class="item-title">{{ item.title }}</h1>
                        </div>

                        <div class="item-price-group">
                            <p class="item-price">{{ formatPrice(getDisplayPrice(item)) }}</p>
                            <p v-if="item.isDiscounted" class="item-price-old">{{ formatPrice(item.originalPrice) }}</p>
                        </div>

                        <p class="item-description">{{ item.description }}</p>

                        <div class="item-highlights">
                            <article class="item-highlight">
                                <span class="profile-label">Категория</span>
                                <strong>{{ getCategoryLabel(item.category) }}</strong>
                            </article>
                            <article class="item-highlight">
                                <span class="profile-label">Артикул</span>
                                <strong>{{ String(100000 + Number(item.id || 0)) }}</strong>
                            </article>
                        </div>

                        <div class="item-actions">
                            <button
                                type="button"
                                class="detail-action primary"
                                disabled
                                title="Функция появится позже"
                            >
                                Добавить в корзину
                            </button>
                            <button
                                type="button"
                                class="favorite-heart-button"
                                :class="{ 'is-active': isFavorite, 'is-loading': isFavoriteActionLoading }"
                                :disabled="isFavoriteActionLoading || !item"
                                @click="addToFavorites"
                                :aria-label="isFavorite ? 'Товар уже в избранном' : 'Добавить в избранное'"
                                :title="isFavorite ? 'Товар уже в избранном' : 'Добавить в избранное'"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 20.8 4.9 13.9a4.8 4.8 0 0 1 0-6.9 4.9 4.9 0 0 1 7 0l.1.1.1-.1a4.9 4.9 0 0 1 7 0 4.8 4.8 0 0 1 0 6.9Z" />
                                </svg>
                            </button>
                        </div>

                        <p v-if="favoriteMessage" class="item-note">{{ favoriteMessage }}</p>
                    </div>
                </section>

                <section v-if="relatedItems.length" class="collection-section">
                    <div class="collection-heading item-related-heading">
                        <div>
                            <p class="hero-kicker">Похожие изделия</p>
                            <h2 class="collection-title">Украшения в том же настроении</h2>
                        </div>
                        <p class="collection-copy">
                            Подобрали ещё несколько украшений из той же категории.
                        </p>
                    </div>

                    <div class="collection-grid">
                        <article
                            v-for="relatedItem in relatedItems"
                            :key="relatedItem.id"
                            class="product-card"
                        >
                            <div class="product-media">
                                <img :src="relatedItem.imageUrl" :alt="relatedItem.title">
                            </div>
                            <div class="product-body">
                                <div class="product-meta">
                                    <span class="product-category">{{ getCategoryLabel(relatedItem.category) }}</span>
                                    <span v-if="relatedItem.isDiscounted" class="product-badge product-badge-discount">Скидка -{{ relatedItem.discountPercent }}%</span>
                                    <span v-if="relatedItem.isPopular" class="product-badge">Популярное</span>
                                </div>
                                <h2 class="product-title">{{ relatedItem.title }}</h2>
                                <p class="product-description">{{ relatedItem.description }}</p>
                                <div class="product-footer product-footer-actions">
                                    <div class="product-price-group">
                                        <strong class="product-price">{{ formatPrice(getDisplayPrice(relatedItem)) }}</strong>
                                        <span v-if="relatedItem.isDiscounted" class="product-price-old">{{ formatPrice(relatedItem.originalPrice) }}</span>
                                    </div>
                                    <router-link
                                        class="detail-link"
                                        :to="'/catalog/' + relatedItem.id"
                                    >
                                        Подробнее
                                    </router-link>
                                </div>
                            </div>
                        </article>
                    </div>
                </section>
            </template>
        </main>
    </div>
    `,

    data() {
        return {
            item: null,
            relatedItems: [],
            isLoading: false,
            errorMessage: '',
            isFavorite: false,
            isFavoriteActionLoading: false,
            favoriteMessage: ''
        };
    },

    mounted() {
        this.loadPageData();
    },

    watch: {
        '$route.params.id'() {
            this.loadPageData();
        }
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
            return this.$store.getters.authHeaders;
        },

        async loadPageData() {
            this.isLoading = true;
            this.errorMessage = '';
            this.item = null;
            this.relatedItems = [];
            this.isFavorite = false;
            this.favoriteMessage = '';

            try {
                const itemId = this.$route.params.id;
                const itemResponse = await fetch(`/api/items/${itemId}`);
                const itemResult = await itemResponse.json().catch(() => null);

                if (!itemResponse.ok || itemResult?.status !== 'ok' || !itemResult?.item) {
                    this.errorMessage = this.getApiErrorMessage(itemResult, 'Не удалось загрузить товар.');
                    return;
                }

                this.item = itemResult.item;
                await this.loadFavoriteState();
                await this.loadRelatedItems(itemId);
            } catch (err) {
                this.errorMessage = 'Не удалось загрузить товар. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.isLoading = false;
            }
        },

        async loadRelatedItems(itemId) {
            try {
                const relatedResponse = await fetch(`/api/items?related=${itemId}`);
                const relatedResult = await relatedResponse.json().catch(() => null);

                if (!relatedResponse.ok || relatedResult?.status !== 'ok') {
                    return;
                }

                this.relatedItems = Array.isArray(relatedResult.items)
                    ? relatedResult.items.slice(0, 3)
                    : [];
            } catch (err) {
                this.relatedItems = [];
            }
        },

        async loadFavoriteState() {
            const headers = this.getAuthHeaders();

            if (!headers || !this.item) {
                this.isFavorite = false;
                return;
            }

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
                    this.isFavorite = false;
                    return;
                }

                this.isFavorite = Array.isArray(result?.items)
                    && result.items.some((favoriteItem) => favoriteItem.id === this.item.id);
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                }

                this.isFavorite = false;
            }
        },

        async addToFavorites() {
            if (!this.item || this.isFavorite || this.isFavoriteActionLoading) {
                return;
            }

            const headers = this.getAuthHeaders();

            if (!headers) {
                this.$router.push('/auth/login');
                return;
            }

            this.isFavoriteActionLoading = true;
            this.favoriteMessage = '';

            try {
                const response = await fetch(`/api/users/me/favorites/${this.item.id}`, {
                    method: 'POST',
                    credentials: 'include',
                    headers
                });
                const result = await response.json().catch(() => null);

                if (response.status === 401) {
                    throw new Error('Unauthorized');
                }

                if (!response.ok || result?.status !== 'ok') {
                    this.favoriteMessage = this.getApiErrorMessage(result, 'Не удалось добавить товар в избранное.');
                    return;
                }

                this.isFavorite = true;
                this.favoriteMessage = 'Товар добавлен в избранное.';
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.push('/auth/login');
                    return;
                }

                this.favoriteMessage = 'Не удалось добавить товар в избранное. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.isFavoriteActionLoading = false;
            }
        }
    }
};
