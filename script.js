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

function buildCategoryNavCard(category) {
    const card = document.createElement('a');
    card.className = 'featured-card category-nav-card';
    card.href = category.page;
    card.innerHTML = [
        '<div class="featured-image">',
        '<img src="', escapeHtml(category.image), '" alt="', escapeHtml(category.title), '" loading="lazy">',
        '</div>',
        '<div class="featured-info">',
        '<h3 class="featured-title">', escapeHtml(category.title), '</h3>',
        '<p class="featured-description">', escapeHtml(category.description), '</p>',
        '<span class="featured-cta">View collection &rarr;</span>',
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

async function loadCategories() {
    const response = await fetch('data/categories.json');
    if (!response.ok) {
        throw new Error('Failed to load categories.json (' + response.status + ')');
    }
    const data = await response.json();
    return data.categories || [];
}

async function initHomepageCategories(categories) {
    const grid = document.getElementById('home-categories-grid');
    if (!grid) return;
    grid.innerHTML = '';
    categories.forEach(function (category) {
        grid.appendChild(buildCategoryNavCard(category));
    });
}

async function initCategoryModelsGrid(models) {
    const grid = document.getElementById('category-models-grid');
    if (!grid) return;
    const categoryId = grid.dataset.category;
    const categoryModels = models.filter(function (m) { return m.category === categoryId; });
    grid.innerHTML = '';
    if (categoryModels.length === 0) {
        grid.innerHTML = '<p class="category-empty">Designs coming soon. <a href="https://makerworld.com/en/@spencermann">Browse on MakerWorld</a>.</p>';
        return;
    }
    categoryModels.forEach(function (model) {
        grid.appendChild(buildFeaturedCard(model));
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
            if (form.embedHeight) {
                iframe.height = String(form.embedHeight);
                iframe.style.minHeight = form.embedHeight + 'px';
            }
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

    const homeCategoriesGrid = document.getElementById('home-categories-grid');
    const categoryModelsGrid = document.getElementById('category-models-grid');

    if (!homeCategoriesGrid && !categoryModelsGrid) return;

    try {
        if (homeCategoriesGrid) {
            const categories = await loadCategories();
            await initHomepageCategories(categories);
        }
        if (categoryModelsGrid) {
            const models = await loadModels();
            await initCategoryModelsGrid(models);
        }
    } catch (err) {
        console.error('Could not load site data:', err);
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
