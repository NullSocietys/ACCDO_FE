import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../core/data/mock-data';
import { DataStoreService } from '../../core/services/data-store.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

interface MemberItem {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  celular: string;
}

interface MemberPair {
  a: MemberItem;
  b: MemberItem | null;
}

interface GroupCard {
  key: string;
  grupo: string;
  modalidad: string;
  eventoNombre: string;
  encargado: string;
  codigo: string;
  estado: string;
  members: MemberItem[];
}

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
}

@Component({
  selector: 'app-participantes-page',
  imports: [
    FormsModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputComponent,
    ModalComponent,
    PaginationComponent,
    SkeletonComponent,
  ],
  styleUrl: './participantes.page.css',
  templateUrl: './participantes.page.html',
})
export class ParticipantesPage {
  readonly store = inject(DataStoreService);
  readonly statusTone = statusTone;
  readonly statusLabel = statusLabel;
  readonly modalidades = CATEGORIAS;

  readonly search = signal('');
  readonly modalidadFilter = signal('');
  readonly grupoFilter = signal('');
  readonly selectedGroup = signal<GroupCard | null>(null);
  readonly pageSize = 10;
  readonly page = signal(1);
  /** Esqueleto de carga inicial (igual que el dashboard). */
  readonly cargando = signal(true);

  readonly groups = computed((): GroupCard[] => {
    const map = new Map<string, GroupCard>();

    for (const p of this.store.participantesView()) {
      const key = p.inscripcionId;
      let card = map.get(key);
      if (!card) {
        card = {
          key,
          grupo: p.nombreGrupo,
          modalidad: p.categoriaNombre,
          eventoNombre: p.eventoNombre,
          encargado: p.responsableNombre,
          codigo: p.codigoInscripcion,
          estado: p.estadoInscripcion,
          members: [],
        };
        map.set(key, card);
      }
      card.members.push({
        id: p.id,
        nombreCompleto: p.nombres,
        iniciales: inicialesDe(p.nombres),
        celular: p.celular ?? '—',
      });
    }

    return [...map.values()].sort((a, b) => a.grupo.localeCompare(b.grupo, 'es'));
  });

  readonly grupos = computed(() => this.groups().map((g) => g.grupo));

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const mod = this.modalidadFilter();
    const grupo = this.grupoFilter();

    return this.groups().filter((g) => {
      const matchMod = !mod || g.modalidad === mod;
      const matchGrupo = !grupo || g.grupo === grupo;
      const matchQ =
        !q ||
        g.grupo.toLowerCase().includes(q) ||
        g.modalidad.toLowerCase().includes(q) ||
        g.eventoNombre.toLowerCase().includes(q) ||
        g.encargado.toLowerCase().includes(q) ||
        g.codigo.toLowerCase().includes(q) ||
        g.members.some(
          (m) =>
            m.nombreCompleto.toLowerCase().includes(q) ||
            m.celular.includes(q),
        );
      return matchMod && matchGrupo && matchQ;
    });
  });

  readonly memberCount = computed(() =>
    this.filtered().reduce((sum, g) => sum + g.members.length, 0),
  );

  readonly paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  readonly totalMembers = computed(() =>
    this.groups().reduce((sum, g) => sum + g.members.length, 0),
  );

  readonly uniqueModalidades = computed(() =>
    new Set(this.groups().map((g) => g.modalidad)).size,
  );

  readonly modalDescription = computed(() => {
    const g = this.selectedGroup();
    if (!g) return null;
    return `${g.modalidad} · ${g.eventoNombre} · Encargado: ${g.encargado}`;
  });

  readonly modalUsesPairs = computed(() => {
    const g = this.selectedGroup();
    return g ? this.isPairModalidad(g.modalidad) : false;
  });

  readonly modalPairs = computed((): MemberPair[] => {
    const g = this.selectedGroup();
    if (!g) return [];
    return this.toPairs(g.members);
  });

  isPairModalidad(modalidad: string): boolean {
    const m = modalidad.toUpperCase();
    return m.includes('PAREJA') || m.includes('DUOS') || m.includes('BALLET');
  }

  toPairs(members: MemberItem[]): MemberPair[] {
    const pairs: MemberPair[] = [];
    for (let i = 0; i < members.length; i += 2) {
      pairs.push({ a: members[i], b: members[i + 1] ?? null });
    }
    return pairs;
  }

  openMembers(group: GroupCard): void {
    this.selectedGroup.set(group);
  }

  closeMembers(): void {
    this.selectedGroup.set(null);
  }

  constructor() {
    window.setTimeout(() => this.cargando.set(false), 500);
    effect(() => {
      this.search();
      this.modalidadFilter();
      this.grupoFilter();
      untracked(() => this.page.set(1));
    });
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.modalidadFilter.set('');
    this.grupoFilter.set('');
  }
}
