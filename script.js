// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// Carousel Functionality
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

        // Auto-generate indicators if they don't exist or are insufficient
        this.generateIndicators();

        // Get all indicators after generation
        this.indicators = this.container.querySelectorAll('.carousel-indicator');

        // Set initial state
        this.updateCarousel();

        // Event listeners
        if (this.prevButton) {
            this.prevButton.addEventListener('click', () => this.prevSlide());
        }

        if (this.nextButton) {
            this.nextButton.addEventListener('click', () => this.nextSlide());
        }

        // Indicator clicks
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.container.contains(document.activeElement) || 
                document.activeElement === document.body) {
                if (e.key === 'ArrowLeft') this.prevSlide();
                if (e.key === 'ArrowRight') this.nextSlide();
            }
        });

        // Auto-play (optional - uncomment if desired)
        // this.autoPlay();
    }

    generateIndicators() {
        if (!this.indicatorsContainer) return;
        
        // Clear existing indicators
        this.indicatorsContainer.innerHTML = '';
        
        // Generate indicators based on number of slides
        for (let i = 0; i < this.totalSlides; i++) {
            const indicator = document.createElement('button');
            indicator.className = 'carousel-indicator';
            if (i === 0) indicator.classList.add('active');
            indicator.setAttribute('aria-label', `Slide ${i + 1}`);
            this.indicatorsContainer.appendChild(indicator);
        }
    }

    updateCarousel() {
        // Move track
        const translateX = -this.currentIndex * 100;
        this.track.style.transform = `translateX(${translateX}%)`;

        // Update indicators
        this.indicators.forEach((indicator, index) => {
            if (index === this.currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });

        // Update button states
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

    autoPlay() {
        setInterval(() => {
            if (this.currentIndex < this.totalSlides - 1) {
                this.nextSlide();
            } else {
                this.goToSlide(0);
            }
        }, 5000); // Change slide every 5 seconds
    }
}

// Initialize all carousels on page load
document.addEventListener('DOMContentLoaded', () => {
    const carouselContainers = document.querySelectorAll('.carousel-container');
    carouselContainers.forEach(container => {
        new Carousel(container);
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

