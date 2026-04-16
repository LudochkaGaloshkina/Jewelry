import AppHeader from './AppHeader.js';

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
                    <p class="collection-copy">
                        Подборка популярных изделий из базы магазина: кольца, серьги,
                        браслеты и колье с акцентом на премиальные материалы и выразительный блеск.
                    </p>
                </div>

                <p v-if="itemsError" class="collection-state">{{ itemsError }}</p>
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
                                    <span v-if="item.isPopular" class="product-badge">Популярное</span>
                                </div>
                                <h3 class="product-title">{{ item.title }}</h3>
                                <p class="product-description">{{ item.description }}</p>
                                <div class="product-footer">
                                    <strong class="product-price">{{ formatPrice(item.price) }}</strong>
                            </div>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    </div>
    `,

    mounted() {
        this.setupSlider();
        this.startAutoSlide();
        this.loadPopularItems();
    },

    beforeUnmount() {
        this.stopAutoSlide();
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
            itemsError: ''
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
                const result = await response.json();

                if (!response.ok || result.status !== 'ok') {
                    this.itemsError = 'Не удалось загрузить товары.';
                    return;
                }

                this.popularItems = Array.isArray(result.items) ? result.items : [];
            } catch (err) {
                this.itemsError = 'Не удалось загрузить товары.';
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
                currency: 'RUB',
                maximumFractionDigits: 0
            }).format(amount);
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
