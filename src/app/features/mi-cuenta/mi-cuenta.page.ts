import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InscripcionApiService } from '../../core/services/api/inscripcion.api.service';
import { CategoriaApiService } from '../../core/services/api/categoria.api.service';
import { SiteHeaderComponent } from '../../shared/ui/site-header/site-header.component';
import { Inscripcion, InscripcionEstado } from '../../core/models';

@Component({
  selector: 'app-mi-cuenta-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SiteHeaderComponent],
  templateUrl: './mi-cuenta.page.html',
  styleUrl: './mi-cuenta.page.css',
})
export class MiCuentaPage {
  private readonly inscripcionApi = inject(InscripcionApiService);
  private readonly categoriaApi = inject(CategoriaApiService);

  readonly inscripciones = signal<Inscripcion[]>([]);
  readonly categoriasPorId = signal<Record<string, string>>({});
  readonly loading = signal(true);
  readonly errorMsg = signal('');

  ngOnInit(): void {
    this.cargarInscripciones();
  }

  private cargarInscripciones(): void {
    this.loading.set(true);
    this.categoriaApi.listar(true).subscribe({
      next: (categorias) => {
        const mapa: Record<string, string> = {};
        for (const c of categorias) mapa[c.id] = c.nombre;
        this.categoriasPorId.set(mapa);
        this.inscripcionApi.misInscripciones().subscribe({
          next: (inscripciones) => {
            this.inscripciones.set(inscripciones);
            this.loading.set(false);
          },
          error: (err) => {
            this.errorMsg.set(err?.message || 'No se pudieron cargar tus inscripciones');
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.errorMsg.set(err?.message || 'No se pudieron cargar tus inscripciones');
        this.loading.set(false);
      },
    });
  }

  nombreCategoria(id: string): string {
    return this.categoriasPorId()[id] ?? 'Modalidad';
  }
}
