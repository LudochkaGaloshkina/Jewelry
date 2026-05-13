import AppHeader from './AppHeader.js';

export default {
    components: {
        AppHeader
    },

    template: `
    <div class="catalog-page">
        <app-header mode="catalog"></app-header>

        <main class="home-content">
            <section class="catalog-hero">
                <p class="hero-kicker">Каталог</p>
                <h1 class="catalog-title">Полная коллекция украшений Diamond Blackstar</h1>
            </section>

            <section class="catalog-layout">
                <aside class="catalog-filters">
                    <label class="field">
                        <span class="field-label">Поиск по названию</span>
                        <input
                            v-model.trim="searchQuery"
                            type="text"
                            placeholder="Например, ring или necklace"
                            @input="handleSearchInput"
                        >
                    </label>

                    <label class="field">
                        <span class="field-label">Категория</span>
                        <select v-model="selectedCategory" @change="resetFiltersPage">
                            <option value="">Все категории</option>
                            <option
                                v-for="category in categories"
                                :key="category"
                                :value="category"
                            >
                                {{ getCategoryLabel(category) }}
                            </option>
                        </select>
                    </label>

                    <label class="field">
                        <span class="field-label">Сортировка</span>
                        <select v-model="selectedSort" @change="resetFiltersPage">
                            <option value="popular">Сначала популярные</option>
                            <option value="price_asc">Сначала дешевле</option>
                            <option value="price_desc">Сначала дороже</option>
                        </select>
                    </label>

                    <label class="catalog-toggle">
                        <input
                            v-model="popularOnly"
                            type="checkbox"
                            @change="resetFiltersPage"
                        >
                        <span>Показывать только популярные</span>
                    </label>
                </aside>

                <section class="catalog-results">
                    <div class="catalog-meta">
                        <p class="catalog-count">
                            {{ isLoading ? 'Загрузка...' : 'Найдено: ' + totalItems }}
                        </p>
                        <p v-if="totalPages > 1" class="catalog-page-indicator">
                            Страница {{ currentPage }} из {{ totalPages }}
                        </p>
                    </div>

                    <p v-if="errorMessage" class="collection-state collection-state-error">{{ errorMessage }}</p>
                    <p v-else-if="isLoading" class="collection-state">Подбираем украшения...</p>
                    <p v-else-if="items.length === 0" class="collection-state">
                        По текущим фильтрам товаров не найдено.
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

                    <nav v-if="!isLoading && !errorMessage && totalPages > 1" class="catalog-pagination" aria-label="Пагинация каталога">
                        <button
                            type="button"
                            class="pagination-button"
                            :disabled="currentPage === 1"
                            @click="goToPage(currentPage - 1)"
                        >
                            Назад
                        </button>

                        <button
                            v-for="pageNumber in visiblePages"
                            :key="pageNumber"
                            type="button"
                            class="pagination-button"
                            :class="{ 'is-active': pageNumber === currentPage }"
                            @click="goToPage(pageNumber)"
                        >
                            {{ pageNumber }}
                        </button>

                        <button
                            type="button"
                            class="pagination-button"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(currentPage + 1)"
                        >
                            Вперёд
                        </button>
                    </nav>
                </section>
            </section>
        </main>
    </div>
    `,

    data() {
        return {
            items: [],
            categories: ['Rings', 'Earrings', 'Bracelets', 'Necklaces', 'Pendants'],
            searchQuery: '',
            selectedCategory: '',
            selectedSort: 'popular',
            popularOnly: false,
            isLoading: false,
            errorMessage: '',
            searchDebounceId: null,
            currentPage: 1,
            itemsPerPage: 6,
            totalPages: 0,
            totalItems: 0,
            addingCartItemId: null,
            cartMessage: ''
        };
    },

    computed: {
        visiblePages() {
            const pages = [];
            const startPage = Math.max(1, this.currentPage - 1);
            const endPage = Math.min(this.totalPages, startPage + 2);
            const normalizedStart = Math.max(1, endPage - 2);

            for (let pageNumber = normalizedStart; pageNumber <= endPage; pageNumber += 1) {
                pages.push(pageNumber);
            }

            return pages;
        }
    },

    mounted() {
        this.loadItems();
    },

    beforeUnmount() {
        if (this.searchDebounceId) {
            clearTimeout(this.searchDebounceId);
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

        handleSearchInput() {
            if (this.searchDebounceId) {
                clearTimeout(this.searchDebounceId);
            }

            this.searchDebounceId = setTimeout(() => {
                this.currentPage = 1;
                this.loadItems();
            }, 250);
        },

        resetFiltersPage() {
            this.currentPage = 1;
            this.loadItems();
        },

        goToPage(pageNumber) {
            if (pageNumber === this.currentPage || pageNumber < 1 || pageNumber > this.totalPages) {
                return;
            }

            this.currentPage = pageNumber;
            this.loadItems();
        },

        getApiErrorMessage(result, fallbackMessage) {
            const serverMessage = typeof result?.message === 'string' ? result.message.trim() : '';

            if (serverMessage) {
                return `${fallbackMessage} ${serverMessage}.`;
            }

            return fallbackMessage;
        },

        async loadItems() {
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const params = new URLSearchParams();

                if (this.searchQuery) {
                    params.set('q', this.searchQuery);
                }

                if (this.selectedCategory) {
                    params.set('category', this.selectedCategory);
                }

                if (this.selectedSort) {
                    params.set('sort', this.selectedSort);
                }

                if (this.popularOnly) {
                    params.set('popular', 'true');
                }

                params.set('page', String(this.currentPage));
                params.set('limit', String(this.itemsPerPage));

                const response = await fetch(`/api/items?${params.toString()}`);
                const result = await response.json().catch(() => null);

                if (!response.ok || result?.status !== 'ok') {
                    this.items = [];
                    this.totalItems = 0;
                    this.totalPages = 0;
                    this.errorMessage = this.getApiErrorMessage(result, 'Не удалось загрузить каталог.');
                    return;
                }

                this.items = Array.isArray(result.items) ? result.items : [];
                this.totalItems = Number(result.pagination?.totalItems) || this.items.length;
                this.totalPages = Number(result.pagination?.totalPages) || (this.totalItems > 0 ? 1 : 0);
                this.currentPage = Number(result.pagination?.page) || 1;
            } catch (err) {
                this.items = [];
                this.totalItems = 0;
                this.totalPages = 0;
                this.errorMessage = 'Не удалось загрузить каталог. Проверьте подключение к API и попробуйте ещё раз.';
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
                    this.cartMessage = this.getApiErrorMessage(result, 'Не удалось добавить товар в корзину.');
                    return;
                }

                this.cartMessage = `${item.title} добавлен в корзину.`;
            } catch (err) {
                if (err.message === 'Unauthorized') {
                    this.$store.dispatch('clearAuth');
                    this.$router.push('/auth/login');
                    return;
                }

                this.cartMessage = 'Не удалось добавить товар в корзину. Проверьте подключение к API и попробуйте ещё раз.';
            } finally {
                this.addingCartItemId = null;
            }
        }
    }
};
