import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthSessionService } from '../../core/services/auth-session.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly correo = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  submit(): void {
    if (this.loading()) return;

    const correo = this.correo().trim();
    const password = this.password();

    if (!correo || !password) {
      this.errorMsg.set('Ingresa tu correo y contraseña');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.auth
      .login({ correo, password })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.safeAdminReturnUrl());
        },
        error: (err: Error) => {
          this.errorMsg.set(err?.message || 'No se pudo iniciar sesión');
        },
      });
  }

  /** Solo permite volver dentro de /admin (evita open-redirect). */
  private safeAdminReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin';
    if (raw === '/admin' || (raw.startsWith('/admin/') && !raw.startsWith('//'))) {
      return raw;
    }
    return '/admin';
  }
}
