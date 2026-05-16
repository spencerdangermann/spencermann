// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22400%22%3E%3Crect fill=%22%23222%22 width=%22600%22 height=%22400%22/%3E%3Ctext fill=%22%23fff%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EDesign Image%3C/text%3E%3C/svg%3E";

function addMakerworldUtm(url, campaignId) {
    try {
        const parsed = new URL(url);
        parsed.searchParams.set('utm_source', 'spencermann');
        parsed.searchParams.set('utm_medium', 'website');
        parsed.searchParams.set('utm_campaign', campaignId);
        return parsed.toString();
    } catch {
        return url;
    }
}

function escapeHtml(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
}

function buildCarouselSlide(model) {
    const link = addMakerworldUtm(model.makerworldUrl, model.id);
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = [
        '<img src="', escapeHtml(model.image), '" alt="', escapeHtml(model.title), '" class="carousel-image" loading="lazy">',
        '<div class="carousel-content">',
        '<h2 class="carousel-title">', escapeHtml(model.title), '</h2>',
        '<p class="carousel-description">', escapeHtml(model.description), '</p>',
        '<a href="', escapeHtml(link), '" class="carousel-link" target="_blank" rel="noopener noreferrer">',
        'Download on MakerWorld',
        '</a>',
        '</div>'
    ].join('');
    const img = slide.querySelector('.carousel-image');
    img.onerror = () => { img.src = PLACEHOLDER_SVG; };
    return slide;
}

function buildFeaturedCard(model) {
    const link = addMakerworldUtm(model.makerworldUrl, model.id);
    const card = document.createElement('a');
    card.className = 'featured-card';
    card.href = link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.innerHTML = [
        '<div class="featured-image">',
        '<img src="', escapeHtml(model.image), '" alt="', escapeHtml(model.title), '" loading="lazy">',
        '</div>',
        '<div class="featured-info">',
        '<h3 class="featured-title">', escapeHtml(model.title), '</h3>',
        '<p class="featured-description">', escapeHtml(model.description), '</p>',
        '<span class="featured-cta">Download on MakerWorld &rarr;</span>',
        '</div>'
    ].join('');
    const img = card.querySelector('img');
    img.onerror = () => { img.src = PLACEHOLDER_SVG; };
    return card;
}

async function loadModels() {
    const response = await fetch('data/models.json');
    if (!response.ok) {
        throw new Error('Failed to load models.json (' + response.status + ')');
    }
    const data = await response.json();
    return data.models || [];
}

class Carousel {
    constructor(container) {
        this.container = container;
        this.track = container.querySelector('.carousel-track');
        this.slides = container.querySelectorAll('.carousel-slide');
        this.prevButton = container.querySelector('.carousel-button.prev');
        this.nextButton = container.querySelector('.carousel-button.next');
        this.indicatorsContainer = container.querySelector('.carousel-indicators');
        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.init();
    }

    init() {
        if (this.totalSlides === 0) return;

        this.generateIndicators();
        this.indicators = this.container.querySelectorAll('.carousel-indicator');
        this.updateCarousel();

        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.prevSlide());
        }
        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextSlide());
        }
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        document.addEventListener('keydown', (e) => {
            if (this.container.contains(document.activeElement) || document.activeElement === document.body) {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            }
        });
    }

    generateIndicators() {
        if (!this.indicatorsContainer) return;
        this.indicatorsContainer.innerHTML = '';
        for (let i = 0; i < this.totalSlides; i++) {
            const indicator = document.createElement('button');
            indicator.className = 'carousel-indicator';
            if (i === 0) indicator.classList.add('active');
            indicator.setAttribute('aria-label', 'Slide ' + (i + 1));
            this.indicatorsContainer.appendChild(indicator);
        }
    }

    updateCarousel() {
        this.track.style.transform = 'translateX(' + (-this.currentIndex * 100) + '%)';
        this.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });
        if (this.prevButton) {
            this.prevButton.style.opacity = this.currentIndex === 0 ? '0.5' : '1';
            this.prevButton.style.cursor = this.currentIndex === 0 ? 'not-allowed' : 'pointer';
        }
        if (this.nextButton) {
            this.nextButton.style.opacity = this.currentIndex === this.totalSlides - 1 ? '0.5' : '1';
            this.nextButton.style.cursor = this.currentIndex === this.totalSlides - 1 ? 'not-allowed' : 'pointer';
        }
    }

    nextSlide() {
        if (this.currentIndex < this.totalSlides - 1) {
            this.currentIndex++;
            this.updateCarousel();
        }
    }

    prevSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateCarousel();
        }
    }

    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.currentIndex = index;
            this.updateCarousel();
        }
    }
}

async function initCategoryCarousels(models) {
    const containers = document.querySelectorAll('.carousel-container[data-category]');
    for (const container of containers) {
        const category = container.dataset.category;
        const track = container.querySelector('.carousel-track');
        const categoryModels = models.filter(function (m) { return m.category === category; });
        track.innerHTML = '';
        if (categoryModels.length === 0) {
            track.innerHTML = '<p class="carousel-empty">Designs coming soon. <a href="https://makerworld.com/en/@spencermann">Browse on MakerWorld</a>.</p>';
            continue;
        }
        categoryModels.forEach(function (model) {
            track.appendChild(buildCarouselSlide(model));
        });
        new Carousel(container);
    }
}

async function initFeaturedSection(models) {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    const featured = models.filter(function (m) { return m.featured; });
    grid.innerHTML = '';
    featured.forEach(function (model) {
        grid.appendChild(buildFeaturedCard(model));
    });
}

function initStaticCarousels() {
    document.querySelectorAll('.carousel-container:not([data-category])').forEach(function (container) {
        new Carousel(container);
    });
}

async function initDesignRequestForm() {
    const iframe = document.getElementById('google-form-iframe');
    const readyBlock = document.getElementById('request-form-ready');
    const setupBlock = document.getElementById('request-form-setup');
    if (!iframe || !readyBlock || !setupBlock) return;

    try {
        const response = await fetch('data/form-config.json');
        if (!response.ok) throw new Error('Failed to load form-config.json');
        const config = await response.json();
        const form = config.designRequestForm || {};
        const embedUrl = (form.embedUrl || '').trim();
        const viewUrl = (form.viewUrl || '').trim();

        const titleEl = document.getElementById('request-page-title');
        const descEl = document.getElementById('request-page-description');
        if (titleEl && form.title) titleEl.textContent = form.title;
        if (descEl && form.description) descEl.textContent = form.description;

        if (embedUrl) {
            iframe.src = embedUrl;
            readyBlock.hidden = false;
            setupBlock.hidden = true;
            const openLink = document.getElementById('request-form-open-link');
            if (openLink && viewUrl) openLink.href = viewUrl;
            else if (openLink) openLink.href = embedUrl.replace('?embedded=true', '');
            return;
        }
    } catch (err) {
        console.error('Could not load design request form config:', err);
    }

    readyBlock.hidden = true;
    setupBlock.hidden = false;
}

document.addEventListener('DOMContentLoaded', async function () {
    await initDesignRequestForm();

    const hasDynamicContent = document.querySelector('[data-category]') || document.getElementById('featured-grid');
    if (hasDynamicContent) {
        try {
            const models = await loadModels();
            await initCategoryCarousels(models);
            await initFeaturedSection(models);
        } catch (err) {
            console.error('Could not load designs:', err);
        }
    } else {
        initStaticCarousels();
    }
});

document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
