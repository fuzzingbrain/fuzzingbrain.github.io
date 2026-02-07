/**
 * FuzzingBrain - Site JavaScript
 * Handles: smooth scrolling, header effects, animations, particles, mobile menu
 */
(function () {
    'use strict';

    // --- Smooth scrolling for anchor links ---
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            });
        });
    }

    // --- Header background opacity on scroll ---
    function initHeaderScroll() {
        const header = document.querySelector('.header');
        if (!header) return;
        window.addEventListener('scroll', () => {
            const opacity = Math.min(window.pageYOffset / 100, 0.95);
            header.style.background = `rgba(15, 23, 42, ${opacity})`;
        });
    }

    // --- Intersection Observer for fade-in animations ---
    function initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll(
            '.about-card, .strategy-card, .result-card, .team-member, .resource-card, .highlight, .insight'
        ).forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // --- Counter animation for statistics ---
    function animateCounter(element, start, end, duration) {
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            element.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = end;
            }
        };
        requestAnimationFrame(step);
    }

    function initCounterAnimations() {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const num = entry.target.querySelector('.stat-number') ||
                                entry.target.querySelector('.result-number');
                    if (num) {
                        const val = parseInt(num.textContent);
                        if (!isNaN(val)) animateCounter(num, 0, val, 2000);
                    }
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.stat, .result-card').forEach(el => {
            statObserver.observe(el);
        });
    }

    // --- Particle effect for hero section ---
    function initParticles() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, {
            position: 'absolute', top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none', opacity: '0.3'
        });
        hero.style.position = 'relative';
        hero.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;

        const particles = Array.from({ length: 50 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2
        }));

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx;
                if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (100 - dist) / 100})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        }

        animate();

        window.addEventListener('resize', () => {
            canvas.width = hero.offsetWidth;
            canvas.height = hero.offsetHeight;
        });
    }

    // --- Mobile menu toggle ---
    function initMobileMenu() {
        const btn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('.nav');
        if (!btn || !nav) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.classList.toggle('active');
            nav.classList.toggle('active');
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                btn.classList.remove('active');
                nav.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !btn.contains(e.target)) {
                btn.classList.remove('active');
                nav.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                btn.classList.remove('active');
                nav.classList.remove('active');
            }
        });
    }

    // --- Page load fade-in ---
    function initPageTransition() {
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        setTimeout(() => { document.body.style.opacity = '1'; }, 100);
    }

    // --- Initialize everything ---
    document.addEventListener('DOMContentLoaded', () => {
        initSmoothScroll();
        initHeaderScroll();
        initScrollAnimations();
        initCounterAnimations();
        initMobileMenu();
        setTimeout(initParticles, 1000);
    });

    window.addEventListener('load', initPageTransition);
})();
