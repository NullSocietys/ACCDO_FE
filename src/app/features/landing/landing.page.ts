import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Configuracion } from '../../core/models/configuracion.model';
import { ConfiguracionApiService } from '../../core/services/api/configuracion.api.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.css'],
  imports: [RouterLink],
})
export class LandingPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly configApi = inject(ConfiguracionApiService);

  private readonly FALLBACK = {
    nombreAsociacion: 'Asociación Cultural Chicote de Oro',
    coordinadoraGeneral: 'Martha Bravo',
    telefono: '926 266 295',
    correo: 'contacto@chicotedeoro.pe',
    direccion: 'Tacna, Perú',
    numeroYape: '926 266 295',
    numeroPlin: '926 266 295',
    fechaLimiteInscripcion: '12 de agosto',
    fechaSorteo: '14 de agosto',
    horaSorteo: '09:00 pm',
  };

  modalAbierto = false;
  datosCoordinacion = { ...this.FALLBACK };
  private datosDesdeApi = false;
  private focoPrevio: HTMLElement | null = null;
  private modalEscListener: ((e: KeyboardEvent) => void) | null = null;

  private autoplayInterval: ReturnType<typeof setInterval> | null = null;
  private dotsMorphTimeout: ReturnType<typeof setTimeout> | null = null;
  private scrollListener: (() => void) | null = null;
  private progWallScrollListener: (() => void) | null = null;

  private introOverlayEl: HTMLElement | null = null;
  private introVideoEl: HTMLVideoElement | null = null;
  private introFallback: ReturnType<typeof setTimeout> | null = null;
  private introWatchdog: ReturnType<typeof setInterval> | null = null;
  private readonly maxIntroMs = 15000;

  private motionMm: gsap.MatchMedia | null = null;
  private heroPlayed = false;
  private readonly interactionCleanups: Array<() => void> = [];
  private fragSub: Subscription | null = null;
  private pendienteFragment: string | null = null;

  ngOnInit(): void {
    document.title = 'Chicote de Oro — Elegancia en movimiento';
  }

  ngAfterViewInit(): void {
    this.initCarousel();
    this.initMobileMenu();
    this.initAnchors();
    this.initHeader();
    this.initProgWallCarousel();
    this.initMotion();
    this.initIntro();
    // Fragmento de ruta (p. ej. /#galeria desde el header de /seguimiento).
    this.fragSub = this.route.fragment.subscribe((f) => {
      if (f) this.irA(f);
    });
    if (this.route.snapshot.fragment) this.irA(this.route.snapshot.fragment);
  }

  ngOnDestroy(): void {
    if (this.modalEscListener) {
      window.removeEventListener('keydown', this.modalEscListener);
      this.modalEscListener = null;
    }
    document.body.style.overflow = '';
    this.clearIntroFallback();
    if (this.introWatchdog) clearInterval(this.introWatchdog);
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    if (this.dotsMorphTimeout) clearTimeout(this.dotsMorphTimeout);
    if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);
    if (this.progWallScrollListener) {
      document.getElementById('progWall')?.removeEventListener('scroll', this.progWallScrollListener);
    }
    this.fragSub?.unsubscribe();
    this.fragSub = null;
    this.teardownInteractions();
    this.motionMm?.revert();
    this.motionMm = null;
    document.title = 'Chicote de Oro — Inscripciones Caporales';
  }

  /* —— Intro video —— */
  private initIntro(): void {
    const yaVisto = sessionStorage.getItem('chicote-intro-played') === '1';
    if (yaVisto) {
      document.getElementById('introOverlay')?.remove();
      queueMicrotask(() => this.playHeroEntrance());
      queueMicrotask(() => this.flushFragmentScroll());
      return;
    }

    this.introOverlayEl = document.getElementById('introOverlay');
    this.introVideoEl = document.getElementById('introVideo') as HTMLVideoElement | null;
    if (!this.introOverlayEl || !this.introVideoEl) {
      queueMicrotask(() => this.playHeroEntrance());
      queueMicrotask(() => this.flushFragmentScroll());
      return;
    }
    sessionStorage.setItem('chicote-intro-played', '1');
    this.prepareIntro(this.introVideoEl);
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
    const video = this.introVideoEl;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (overlay?.parentNode) {
      overlay.remove();
    }
    this.introOverlayEl = null;
    this.playHeroEntrance();
    this.flushFragmentScroll();
  }

  /* —— Scroll a sección vía fragmento de ruta (header compartido) —— */
  private irA(fragment: string): void {
    if (this.introOverlayEl) {
      this.pendienteFragment = fragment;
      return;
    }
    const el = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('#' + fragment);
    if (!el) return;
    this.pendienteFragment = null;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private flushFragmentScroll(): void {
    if (this.pendienteFragment) {
      const f = this.pendienteFragment;
      this.pendienteFragment = null;
      this.irA(f);
    }
  }

  private clearIntroFallback(): void {
    if (this.introFallback) {
      clearTimeout(this.introFallback);
      this.introFallback = null;
    }
  }

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

    const isMobile = window.innerWidth <= 768;
    const videoSrc = isMobile
      ? 'video/animacion-entrada-responsive.mp4'
      : 'video/animacion-entrada.mp4';

    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    overlay.appendChild(video);

    const host = this.host.nativeElement;
    host.insertBefore(overlay, host.firstChild);

    this.introOverlayEl = overlay;
    this.introVideoEl = video;
    this.heroPlayed = false;
    this.prepareIntro(video);
  }

  private prepareIntro(video: HTMLVideoElement): void {
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.playbackRate = 2;

    const isMobile = window.innerWidth <= 768;
    const videoSrc = isMobile
      ? 'video/animacion-entrada-responsive.mp4'
      : 'video/animacion-entrada.mp4';

    video.innerHTML = '';
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.load();

    const finish = () => this.hideIntro();

    this.clearIntroFallback();
    this.introFallback = setTimeout(finish, this.initIntroMs);
    this.introWatchdog = setInterval(() => {
      const ended =
        video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.05);
      if (ended) finish();
    }, 200);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    video.play().catch(finish);
  }

  /* —— GSAP motion —— */
  private initMotion(): void {
    const root = this.host.nativeElement;
    this.motionMm = gsap.matchMedia();

    this.motionMm.add(
      {
        isMotion: '(prefers-reduced-motion: no-preference)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
        isDesktop: '(min-width: 981px)',
        finePointer: '(hover: hover) and (pointer: fine)',
      },
      (context) => {
        const cond = context.conditions as {
          isMotion: boolean;
          reduceMotion: boolean;
          isDesktop: boolean;
          finePointer: boolean;
        };

        if (cond.reduceMotion || !cond.isMotion) {
          gsap.set('.reveal, .hero-anim, .frame-corner', {
            clearProps: 'all',
            autoAlpha: 1,
            y: 0,
            x: 0,
            scale: 1,
          });
          root.classList.add('js-reduced-motion');
          return () => root.classList.remove('js-reduced-motion');
        }

        root.classList.add('js-gsap');
        const q = gsap.utils.selector(root);

        gsap.set(q('.reveal'), { autoAlpha: 0, y: 44 });
        gsap.set(q('.hero-anim'), { autoAlpha: 0, y: 36 });
        gsap.set(q('.frame-corner'), { autoAlpha: 0, scale: 0.85 });

        ScrollTrigger.batch(q('.reveal'), {
          start: 'top 88%',
          once: true,
          interval: 0.1,
          batchMax: 5,
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              stagger: { each: 0.07, from: 'start' },
              ease: 'power3.out',
              overwrite: true,
            });
          },
        });

        this.initSectionTimelines(root, q);

        gsap.to(q('.hero-carousel'), {
          yPercent: 12,
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger: q('#hero')[0] ?? '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.9,
          },
        });

        gsap.to(q('.hero-overlay'), {
          autoAlpha: 0.4,
          ease: 'none',
          scrollTrigger: {
            trigger: q('#hero')[0] ?? '#hero',
            start: 'center top',
            end: 'bottom top',
            scrub: true,
          },
        });

        if (cond.isDesktop) {
          const media = q('.prog-media img')[0];
          if (media) {
            gsap.fromTo(
              media,
              { scale: 1.1, yPercent: -3 },
              {
                scale: 1,
                yPercent: 0,
                ease: 'none',
                force3D: true,
                scrollTrigger: {
                  trigger: q('.prog-media')[0],
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 1,
                },
              },
            );
          }
        }

        const ctaBg = q('.cta-hero__bg img')[0];
        if (ctaBg) {
          gsap.fromTo(
            ctaBg,
            { scale: 1.12 },
            {
              scale: 1,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: q('.cta-hero')[0],
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
              },
            },
          );
        }

        if (cond.finePointer && cond.isDesktop) {
          this.initProductTilts(root, q);
          this.initHoverLift(root, q);
        }

        requestAnimationFrame(() => ScrollTrigger.refresh());

        if (!this.introOverlayEl) {
          this.playHeroEntrance();
        }

        return () => {
          this.teardownInteractions();
          root.classList.remove('js-gsap');
          this.heroPlayed = false;
        };
      },
      root,
    );
  }

  private initSectionTimelines(
    root: HTMLElement,
    q: ReturnType<typeof gsap.utils.selector>,
  ): void {
    const facts = q('.prog-facts')[0];
    if (facts) {
      const cells = q('.prog-fact');
      gsap.set(cells, { autoAlpha: 0, y: 20 });
      gsap.to(cells, {
        autoAlpha: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: facts,
          start: 'top 85%',
          once: true,
        },
      });
    }

    void root;
  }

  private initProductTilts(
    root: HTMLElement,
    q: ReturnType<typeof gsap.utils.selector>,
  ): void {
    const stages = gsap.utils.toArray<HTMLElement>(q('[data-tilt]'));
    const clampRot = gsap.utils.clamp(-7, 7);

    stages.forEach((stage) => {
      gsap.set(stage, { transformPerspective: 900, transformStyle: 'preserve-3d' });

      const rotX = gsap.quickTo(stage, 'rotationX', { duration: 0.45, ease: 'power3' });
      const rotY = gsap.quickTo(stage, 'rotationY', { duration: 0.45, ease: 'power3' });

      const onMove = (e: MouseEvent) => {
        const r = stage.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotY(clampRot(px * 12));
        rotX(clampRot(-py * 10));
      };

      const onLeave = () => {
        rotX(0);
        rotY(0);
      };

      stage.addEventListener('mousemove', onMove);
      stage.addEventListener('mouseleave', onLeave);
      this.interactionCleanups.push(() => {
        stage.removeEventListener('mousemove', onMove);
        stage.removeEventListener('mouseleave', onLeave);
        gsap.set(stage, { clearProps: 'transform,rotationX,rotationY' });
      });
    });

    void root;
  }

  private initHoverLift(
    root: HTMLElement,
    q: ReturnType<typeof gsap.utils.selector>,
  ): void {
    const cards = gsap.utils.toArray<HTMLElement>(
      q('.rate-item, .process-step, .prog-shot'),
    );

    cards.forEach((el) => {
      const yTo = gsap.quickTo(el, 'y', { duration: 0.32, ease: 'power2' });

      const enter = () => yTo(-3);
      const leave = () => yTo(0);

      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      this.interactionCleanups.push(() => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
        gsap.set(el, { clearProps: 'y' });
      });
    });

    void root;
  }

  private teardownInteractions(): void {
    while (this.interactionCleanups.length) {
      this.interactionCleanups.pop()?.();
    }
  }

  private playHeroEntrance(): void {
    if (this.heroPlayed) return;
    const root = this.host.nativeElement;
    if (!root.classList.contains('js-gsap')) {
      this.heroPlayed = true;
      return;
    }

    this.heroPlayed = true;
    const q = gsap.utils.selector(root);

    if (sessionStorage.getItem('chicote-entrance-played') === '1') {
      gsap.set(q('.frame-corner, .hero-anim'), { autoAlpha: 1, y: 0, x: 0, scale: 1 });
      gsap.set(q('.hero-actions .btn'), { autoAlpha: 1, y: 0 });
      const logo = q('.hero-logo')[0];
      if (logo) gsap.set(logo, { scale: 1 });
      return;
    }
    sessionStorage.setItem('chicote-entrance-played', '1');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    tl.addLabel('intro', 0)
      .to(
        q('.frame-corner'),
        { autoAlpha: 1, scale: 1, duration: 0.75, stagger: 0.05 },
        'intro',
      )
      .to(q('.hero-top.hero-anim'), { autoAlpha: 1, y: 0, duration: 0.7 }, 'intro+=0.15')
      .to(
        q('.hero-media.hero-anim'),
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power4.out' },
        'intro+=0.22',
      )
      .to(q('.hero-title.hero-anim'), { autoAlpha: 1, y: 0, duration: 0.85 }, 'intro+=0.32')
      .to(q('.hero-sub.hero-anim'), { autoAlpha: 1, y: 0, duration: 0.7 }, 'intro+=0.45')
      .to(q('.hero-side.hero-anim'), { autoAlpha: 1, y: 0, duration: 0.7 }, 'intro+=0.52')
      .fromTo(
        q('.hero-actions .btn'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.09 },
        'intro+=0.62',
      );

    const logo = q('.hero-logo')[0];
    if (logo) {
      gsap.fromTo(
        logo,
        { scale: 0.9 },
        {
          scale: 1,
          duration: 1.25,
          ease: 'power2.out',
          delay: 0.25,
          force3D: true,
        },
      );
    }
  }

  /* —— Modal de coordinación —— */
  async abrirModalCoordinadores(): Promise<void> {
    if (!this.datosDesdeApi) {
      try {
        const c: Configuracion | null = await firstValueFrom(
          this.configApi.obtenerActiva(),
        );
        if (c) {
          this.datosDesdeApi = true;
          const f = this.FALLBACK;
          this.datosCoordinacion = {
            nombreAsociacion: c.nombreAsociacion || f.nombreAsociacion,
            coordinadoraGeneral: c.coordinadoraGeneral || f.coordinadoraGeneral,
            telefono: c.telefono || f.telefono,
            correo: c.correo || f.correo,
            direccion: c.direccion || f.direccion,
            numeroYape: c.numeroYape || f.numeroYape,
            numeroPlin: c.numeroPlin || f.numeroPlin,
            fechaLimiteInscripcion:
              this.formatearFecha(c.fechaLimiteInscripcion) || f.fechaLimiteInscripcion,
            fechaSorteo: this.formatearFecha(c.fechaSorteo) || f.fechaSorteo,
            horaSorteo: this.formatearHora(c.horaSorteo) || f.horaSorteo,
          };
        }
      } catch {
        /* sin conexión: se usan los datos de respaldo */
      }
    }

    this.focoPrevio = document.activeElement as HTMLElement | null;
    this.modalAbierto = true;
    document.body.style.overflow = 'hidden';
    this.modalEscListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.cerrarModalCoordinadores();
    };
    window.addEventListener('keydown', this.modalEscListener);
    requestAnimationFrame(() => {
      const close = this.host.nativeElement.querySelector(
        '.coord-modal__close',
      ) as HTMLButtonElement | null;
      close?.focus();
    });
  }

  cerrarModalCoordinadores(): void {
    this.modalAbierto = false;
    document.body.style.overflow = '';
    if (this.modalEscListener) {
      window.removeEventListener('keydown', this.modalEscListener);
      this.modalEscListener = null;
    }
    this.focoPrevio?.focus();
    this.focoPrevio = null;
  }

  get telefonoHref(): string {
    return `tel:+51${this.datosCoordinacion.telefono.replace(/\D/g, '')}`;
  }

  get whatsappHref(): string {
    return `https://wa.me/51${this.datosCoordinacion.telefono.replace(/\D/g, '')}`;
  }

  private formatearFecha(valor: string): string {
    if (!valor) return '';
    const d = new Date(`${valor}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatearHora(valor: string): string {
    if (!valor) return '';
    const m = /^(\d{1,2}):(\d{2})$/.exec(valor.trim());
    if (!m) return '';
    let horas = Number(m[1]);
    const minutos = m[2];
    const sufijo = horas >= 12 ? 'pm' : 'am';
    horas = horas % 12 || 12;
    return `${horas}:${minutos} ${sufijo}`;
  }

  /* —— Carousel —— */
  private initCarousel(): void {
    const slides = Array.from(document.querySelectorAll<HTMLElement>('.carousel-slide'));
    const prevBtn = document.querySelector<HTMLButtonElement>('.carousel-prev');
    const nextBtn = document.querySelector<HTMLButtonElement>('.carousel-next');
    const dotsContainer = document.getElementById('carouselDots');
    const totalSlides = slides.length;
    if (!totalSlides) return;

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
      slides[currentIndex]?.classList.remove('active');
      dots[currentIndex]?.classList.remove('active');
      currentIndex = (index + totalSlides) % totalSlides;
      slides[currentIndex]?.classList.add('active');
      dots[currentIndex]?.classList.add('active');

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

  /* —— Anclas del menú: scroll con offset del header —— */
  private initAnchors(): void {
    const root = this.host.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link: HTMLAnchorElement) => {
      const onClick = (ev: Event) => {
        const id = (link.getAttribute('href') ?? '').slice(1);
        if (!id) return;
        const target = root.querySelector<HTMLElement>('#' + id);
        if (!target) return;
        // El offset del header lo da la regla CSS `scroll-margin-top` de cada sección:
        // scrollIntoView lo respeta (la navegación nativa por hash no). Un solo movimiento.
        ev.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      link.addEventListener('click', onClick);
      this.interactionCleanups.push(() => link.removeEventListener('click', onClick));
    });
  }

  /* —— Mobile menu —— */
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

  /* —— Header solid on scroll —— */
  private initHeader(): void {
    const siteHeader = document.getElementById('siteHeader');
    const updateHeaderState = () => {
      if (!siteHeader) return;
      siteHeader.classList.toggle('scrolled', window.scrollY > 40);
    };
    updateHeaderState();
    this.scrollListener = updateHeaderState;
    window.addEventListener('scroll', updateHeaderState, { passive: true });
  }

  /* —— Photo wall carousel (mobile) —— */
  private initProgWallCarousel(): void {
    const wall = document.getElementById('progWall');
    const dotsContainer = document.getElementById('progWallDots');
    const prevBtn = document.querySelector<HTMLButtonElement>('.prog-wall-prev');
    const nextBtn = document.querySelector<HTMLButtonElement>('.prog-wall-next');

    if (!wall || !dotsContainer) return;
    if (window.innerWidth > 768) return;

    const shots = Array.from(wall.querySelectorAll<HTMLElement>('.prog-shot'));
    const total = shots.length;

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
        if (dist < minDist) {
          minDist = dist;
          closest = idx;
        }
      });
      return closest;
    };

    const updateDots = (idx: number) => {
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    };

    const scrollToShot = (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, total - 1));
      const shot = shots[clamped];
      wall.scrollTo({
        left: shot.offsetLeft - wall.offsetLeft,
        behavior: 'smooth',
      });
      updateDots(clamped);
    };

    const onScroll = () => updateDots(getActiveIndex());
    wall.addEventListener('scroll', onScroll, { passive: true });
    this.progWallScrollListener = onScroll;

    prevBtn?.addEventListener('click', () => scrollToShot(getActiveIndex() - 1));
    nextBtn?.addEventListener('click', () => scrollToShot(getActiveIndex() + 1));
  }
}
