import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="nf">
      <span class="nf__code">404</span>
      <h1>Página no encontrada</h1>
      <p>El enlace que seguiste ya no existe o cambió de dirección.</p>
      <a class="nf__btn" routerLink="/">Volver al inicio</a>
    </div>
  `,
  styles: `
    .nf {
      min-height: 100dvh;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 0.6rem;
      text-align: center;
      padding: 2rem;
      background: #0d0b08;
      color: #f5efe4;
      font-family: system-ui, sans-serif;
    }
    .nf__code {
      font-size: 4rem;
      font-weight: 800;
      color: #d4a437;
      line-height: 1;
    }
    h1 { margin: 0; font-size: 1.4rem; }
    p { margin: 0 0 1rem; opacity: 0.75; max-width: 34ch; }
    .nf__btn {
      padding: 0.7rem 1.4rem;
      border-radius: 999px;
      background: #d4a437;
      color: #1a1508;
      font-weight: 700;
      text-decoration: none;
    }
  `,
})
export class NotFoundPage {}
