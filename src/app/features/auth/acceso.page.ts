import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthSessionService } from '../../core/services/auth-session.service';

type Modo = 'entrar' | 'crear';

@Component({
  selector: 'app-acceso-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './acceso.page.html',
  styleUrl: './acceso.page.css',
})
export class AccesoPage {
  private readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly modo = signal<Modo>(
    this.route.snapshot.queryParamMap.get('modo') === 'crear' ? 'crear' : 'entrar',
  );
  readonly nombre = signal('');
  readonly correo = signal('');
  readonly password = signal('');
  readonly confirmar = signal('');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  readonly titulo = computed(() =>
    this.modo() === 'entrar' ? 'Bienvenido de nuevo' : 'Únete al concurso',
  );

  readonly lead = computed(() =>
    this.modo() === 'entrar'
      ? 'Entrá con tu correo de delegado y retomá tus inscripciones sin volver a llenar tus datos.'
      : 'Registrate como delegado del VII Concurso. Una sola vez: tus datos quedan listos para cada propuesta.',
  );

  readonly ctaLabel = computed(() => {
    if (this.loading()) return 'Un momento…';
    return this.modo() === 'entrar' ? 'Entrar' : 'Crear cuenta';
  });

  setModo(m: Modo): void {
    this.modo.set(m);
    this.errorMsg.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modo: m === 'crear' ? 'crear' : null, returnUrl: this.returnUrl() || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  submit(): void {
    if (this.loading()) return;

    const correo = this.correo().trim();
    const password = this.password();
    const nombre = this.nombre().trim();

    if (!correo || !password) {
      this.errorMsg.set('Necesitamos tu correo y contraseña para continuar');
      return;
    }

    if (this.modo() === 'crear') {
      if (nombre.length < 2) {
        this.errorMsg.set('Escribe el nombre completo del delegado');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        this.errorMsg.set('La clave debe tener 8+ caracteres, con mayúscula, minúscula y un número');
        return;
      }
      if (password !== this.confirmar()) {
        this.errorMsg.set('Las contraseñas no coinciden. Revísalas e intenta de nuevo');
        return;
      }
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const req$ =
      this.modo() === 'crear'
        ? this.auth.register({ nombre, correo, password })
        : this.auth.loginPublic({ correo, password });

    req$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        // Solo destinos públicos: nunca /admin ni rutas de organización.
        void this.router.navigateByUrl(this.returnUrl() || '/');
      },
      error: (err: Error) => {
        this.errorMsg.set(err?.message || 'No pudimos validar tus credenciales');
      },
    });
  }

  /** Destino post-login; bloquea open-redirect y cualquier ruta de admin. */
  private returnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') || '';
    if (!raw.startsWith('/') || raw.startsWith('//')) return '';
    if (raw === '/admin' || raw.startsWith('/admin/') || raw === '/login' || raw.startsWith('/login?')) {
      return '';
    }
    return raw;
  }
}
