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
                <p class="catalog-description">
                    Исследуйте кольца, серьги, браслеты, колье и подвески с фильтрацией по категории,
                    поиском по названию и удобной сортировкой.
                </p>
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
                        <select v-model="selectedCategory" @change="loadItems">
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
                        <select v-model="selectedSort" @change="loadItems">
                            <option value="">Сначала новинки</option>
                            <option value="popular">Сначала популярные</option>
                            <option value="price_asc">Сначала дешевле</option>
                            <option value="price_desc">Сначала дороже</option>
                        </select>
                    </label>

                    <label class="catalog-toggle">
                        <input
                            v-model="popularOnly"
                            type="checkbox"
                            @change="loadItems"
                        >
                        <span>Показывать только популярные</span>
                    </label>
                </aside>

                <section class="catalog-results">
                    <div class="catalog-meta">
                        <p class="catalog-count">
                            {{ isLoading ? 'Загрузка...' : 'Найдено: ' + items.length }}
                        </p>
                    </div>

                    <p v-if="errorMessage" class="collection-state">{{ errorMessage }}</p>
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
                                    <span v-if="item.isPopular" class="product-badge">Популярное</span>
                                </div>
                                <h2 class="product-title">{{ item.title }}</h2>
                                <p class="product-description">{{ item.description }}</p>
                                <div class="product-footer">
                                    <strong class="product-price">{{ formatPrice(item.price) }}</strong>
                                </div>
                            </div>
                        </article>
                    </div>
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
            selectedSort: '',
            popularOnly: false,
            isLoading: false,
            errorMessage: '',
            searchDebounceId: null
        };
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
                currency: 'RUB',
                maximumFractionDigits: 0
            }).format(amount);
        },

        handleSearchInput() {
            if (this.searchDebounceId) {
                clearTimeout(this.searchDebounceId);
            }

            this.searchDebounceId = setTimeout(() => {
                this.loadItems();
            }, 250);
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

                const response = await fetch(`/api/items?${params.toString()}`);
                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.errorMessage = 'Не удалось загрузить каталог.';
                    return;
                }

                this.items = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.errorMessage = 'Не удалось загрузить каталог.';
            } finally {
                this.isLoading = false;
            }
        }
    }
};
