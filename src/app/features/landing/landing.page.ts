import { Component, AfterViewInit, OnDestroy, OnInit, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css'],
  imports: [RouterLink],
})
export class LandingPage implements OnInit, AfterViewInit, OnDestroy {
  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private dotsMorphTimeout: ReturnType<typeof setTimeout> | null = null;
  private scrollListener: (() => void) | null = null;
  private revealObserver: IntersectionObserver | null = null;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    document.title = 'Chicote de Oro — Elegancia en movimiento';
  }

  ngAfterViewInit(): void {
    this.initIntro();
    this.initCarousel();
    this.initMobileMenu();
    this.initReveal();
    this.initHeader();
    this.initProgWallCarousel();
  }

  /* 0. ANIMACIÓN DE ENTRADA */
  private introOverlayEl: HTMLElement | null = null;
  private introVideoEl: HTMLVideoElement | null = null;
  private introFallback: ReturnType<typeof setTimeout> | null = null;
  private introWatchdog: ReturnType<typeof setInterval> | null = null;
  private readonly maxIntroMs = 15000;

  private initIntro(): void {
    this.introOverlayEl = document.getElementById('introOverlay');
    this.introVideoEl = document.getElementById('introVideo') as HTMLVideoElement | null;
    const video = this.introVideoEl;
    if (!this.introOverlayEl || !video) return;
    this.prepareIntro(video);
  }

  private get initIntroMs(): number {
    const video = this.introVideoEl;
    if (video && isFinite(video.duration) && video.duration > 0) {
      return Math.round((video.duration / 2) * 1000) + 1500;
    }
    return this.maxIntroMs;
  }

  private hideIntro(): void {
    this.clearIntroFallback();
    if (this.introWatchdog) {
      clearInterval(this.introWatchdog);
      this.introWatchdog = null;
    }
    const overlay = this.introOverlayEl;
    const video = this.introVideoEl as HTMLVideoElement | null;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    this.introOverlayEl = null;
  }

  private clearIntroFallback(): void {
    if (this.introFallback) {
      clearTimeout(this.introFallback);
      this.introFallback = null;
    }
  }

  /* Reproduce de nuevo la animación de entrada */
  replayIntro(): void {
    if (this.introOverlayEl) return;

    const overlay = document.createElement('div');
    overlay.className = 'intro-overlay';
    overlay.id = 'introOverlay';
    overlay.setAttribute('aria-hidden', 'true');

    const video = document.createElement('video');
    video.id = 'introVideo';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;
    
    // Detectar si es móvil para usar el video responsive
    const isMobile = window.innerWidth <= 768;
    const videoSrc = isMobile ? 'video/animacion-entrada-responsive.mp4' : 'video/animacion-entrada.mp4';
    
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    overlay.appendChild(video);

    const host = this.elementRef.nativeElement as HTMLElement;
    host.insertBefore(overlay, host.firstChild);

    this.introOverlayEl = overlay;
    this.introVideoEl = video;
    this.prepareIntro(video);
  }

  private prepareIntro(video: HTMLVideoElement): void {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.playbackRate = 2;

    // Detectar si es móvil para usar el video responsive
    const isMobile = window.innerWidth <= 768;
    const videoSrc = isMobile ? 'video/animacion-entrada-responsive.mp4' : 'video/animacion-entrada.mp4';
    
    // Limpiar fuentes existentes y agregar la correcta
    video.innerHTML = '';
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.load(); // Recargar el video con la nueva fuente

    const finish = () => this.hideIntro();

    this.clearIntroFallback();
    this.introFallback = setTimeout(finish, this.initIntroMs);
    this.introWatchdog = setInterval(() => {
      const ended = video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.05);
      if (ended) finish();
    }, 200);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    video.play().catch(finish);
  }

  ngOnDestroy(): void {
    this.clearIntroFallback();
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    if (this.dotsMorphTimeout) clearTimeout(this.dotsMorphTimeout);
    if (this.revealObserver) this.revealObserver.disconnect();
    if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);
    document.title = 'Chicote de Oro — Inscripciones Caporales';
  }

  /* 1. CARRUSEL */
  private initCarousel(): void {
    const slides = Array.from(document.querySelectorAll<HTMLElement>('.carousel-slide'));
    const prevBtn = document.querySelector<HTMLButtonElement>('.carousel-prev');
    const nextBtn = document.querySelector<HTMLButtonElement>('.carousel-next');
    const dotsContainer = document.getElementById('carouselDots');
    const totalSlides = slides.length;

    let currentIndex = 0;
    const SLIDE_DURATION = 5500;

    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.classList.add('carousel-dot');
      if (idx === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Ir a imagen ${idx + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(idx);
        resetAutoplay();
      });
      dotsContainer?.appendChild(dot);
    });

    const dots = Array.from(document.querySelectorAll<HTMLElement>('.carousel-dot'));

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const goToSlide = (index: number) => {
      slides[currentIndex].classList.remove('active');
      dots[currentIndex].classList.remove('active');
      currentIndex = (index + totalSlides) % totalSlides;
      slides[currentIndex].classList.add('active');
      dots[currentIndex].classList.add('active');

      if (!prefersReducedMotion) {
        dotsContainer?.classList.add('dots-morph');
        if (this.dotsMorphTimeout) clearTimeout(this.dotsMorphTimeout);
        this.dotsMorphTimeout = setTimeout(() => {
          dotsContainer?.classList.remove('dots-morph');
        }, 480);
      }
    };

    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);

    nextBtn?.addEventListener('click', () => {
      nextSlide();
      resetAutoplay();
    });
    prevBtn?.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });

    const startAutoplay = () => {
      this.autoplayInterval = setInterval(() => nextSlide(), SLIDE_DURATION);
    };

    const resetAutoplay = () => {
      if (this.autoplayInterval) clearInterval(this.autoplayInterval);
      startAutoplay();
    };

    startAutoplay();
  }

  /* 2. MENÚ MÓVIL */
  private initMobileMenu(): void {
    const menuToggle = document.getElementById('menuToggle');
    const primaryNav = document.getElementById('primaryNav');

    menuToggle?.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!isExpanded));
      primaryNav?.classList.toggle('open');
    });

    primaryNav?.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        primaryNav.classList.remove('open');
        menuToggle?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* 3. REVEAL AL HACER SCROLL */
  private initReveal(): void {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    this.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    revealElements.forEach((el) => this.revealObserver?.observe(el));
  }

  /* 4. ENCABEZADO SÓLIDO AL HACER SCROLL */
  private initHeader(): void {
    const siteHeader = document.getElementById('siteHeader');
    const updateHeaderState = () => {
      if (!siteHeader) return;
      if (window.scrollY > 40) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    };
    updateHeaderState();
    this.scrollListener = updateHeaderState;
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  /* 5. CARRUSEL DEL ÁLBUM DE FOTOS (solo móvil) */
  private progWallScrollListener: (() => void) | null = null;

  private initProgWallCarousel(): void {
    const wall = document.getElementById('progWall');
    const dotsContainer = document.getElementById('progWallDots');
    const prevBtn = document.querySelector<HTMLButtonElement>('.prog-wall-prev');
    const nextBtn = document.querySelector<HTMLButtonElement>('.prog-wall-next');

    if (!wall || !dotsContainer) return;

    const isMobile = () => window.innerWidth <= 768;
    if (!isMobile()) return;

    const shots = Array.from(wall.querySelectorAll<HTMLElement>('.prog-shot'));
    const total = shots.length;

    // Crear dots
    shots.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.classList.add('prog-wall-dot');
      if (idx === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Foto ${idx + 1}`);
      dot.addEventListener('click', () => scrollToShot(idx));
      dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.querySelectorAll<HTMLElement>('.prog-wall-dot'));

    const getActiveIndex = (): number => {
      const wallRect = wall.getBoundingClientRect();
      let closest = 0;
      let minDist = Infinity;
      shots.forEach((shot, idx) => {
        const rect = shot.getBoundingClientRect();
        const dist = Math.abs(rect.left - wallRect.left);
        if (dist < minDist) { minDist = dist; closest = idx; }
      });
      return closest;
    };

    const updateDots = (idx: number) => {
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    };

    const scrollToShot = (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, total - 1));
      const shot = shots[clamped];
      wall.scrollTo({ left: shot.offsetLeft - (wall as HTMLElement).offsetLeft, behavior: 'smooth' });
      updateDots(clamped);
    };

    // Scroll → actualizar dots
    const onScroll = () => updateDots(getActiveIndex());
    wall.addEventListener('scroll', onScroll, { passive: true });
    this.progWallScrollListener = onScroll;

    // Botones prev / next
    prevBtn?.addEventListener('click', () => scrollToShot(getActiveIndex() - 1));
    nextBtn?.addEventListener('click', () => scrollToShot(getActiveIndex() + 1));
  }
}