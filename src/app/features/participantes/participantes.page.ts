import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS } from '../../core/data/mock-data';
import { Sexo } from '../../core/models';
import { DataStoreService } from '../../core/services/data-store.service';
import { BadgeComponent, statusLabel, statusTone } from '../../shared/ui/badge.component';
import { ButtonComponent } from '../../shared/ui/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { InputComponent } from '../../shared/ui/input.component';
import { ModalComponent } from '../../shared/ui/modal.component';

interface MemberItem {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  dni: string;
  edad: number;
  sexo: Sexo;
  sexoLabel: string;
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
  readonly page = signal(1);
  readonly pageSize = 10;

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
        nombreCompleto: `${p.nombres} ${p.apellidos}`,
        iniciales: `${p.nombres.charAt(0)}${p.apellidos.charAt(0)}`.toUpperCase(),
        dni: p.dni,
        edad: p.edad,
        sexo: p.sexo,
        sexoLabel: p.sexo === 'M' ? 'Varón' : 'Mujer',
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
          (m) => m.nombreCompleto.toLowerCase().includes(q) || m.dni.includes(q),
        );
      return matchMod && matchGrupo && matchQ;
    });
  });

  readonly memberCount = computed(() =>
    this.filtered().reduce((sum, g) => sum + g.members.length, 0),
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.page(), total);
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    const end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly paged = computed(() => {
    const list = this.filtered();
    const p = Math.min(Math.max(1, this.page()), this.totalPages());
    const start = (p - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const p = Math.min(this.page(), this.totalPages());
    const from = (p - 1) * this.pageSize + 1;
    const to = Math.min(p * this.pageSize, total);
    return `${from}–${to} de ${total}`;
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
    const remaining = [...members];
    const pairs: MemberPair[] = [];

    while (remaining.length) {
      const first = remaining.shift()!;
      const mateIdx = remaining.findIndex((m) => m.sexo !== first.sexo);
      if (mateIdx >= 0) {
        const [mate] = remaining.splice(mateIdx, 1);
        pairs.push({ a: first, b: mate });
      } else if (remaining.length) {
        const next = remaining.shift()!;
        pairs.push({ a: first, b: next });
      } else {
        pairs.push({ a: first, b: null });
      }
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
    effect(() => {
      this.search();
      this.modalidadFilter();
      this.grupoFilter();
      untracked(() => this.page.set(1));
    });
  }

  goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    this.page.set(next);
  }

  limpiarFiltros(): void {
    this.search.set('');
    this.modalidadFilter.set('');
    this.grupoFilter.set('');
  }
}
