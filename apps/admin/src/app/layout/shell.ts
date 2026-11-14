import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { StockApi } from '../core/api/stock.api';
import { AppState } from '../core/app-state';
import { AuthService } from '../core/auth.service';
import { initials } from '../core/format';
import { ThemeService } from '../core/theme.service';
import { Icon, IconName } from '../ui/icon';
import { ToastOutlet } from '../ui/toast-outlet';
import { Wordmark } from '../ui/wordmark';

interface NavItem {
  path: string;
  label: string;
  short: string;
  icon: IconName;
  match: (url: string) => boolean;
}

const NAV: NavItem[] = [
  {
    path: '/',
    label: 'Commandes',
    short: 'Commandes',
    icon: 'package',
    match: (u) => u === '/' || u.startsWith('/?') || u.startsWith('/#'),
  },
  {
    path: '/messages',
    label: 'Messages IA',
    short: 'Messages',
    icon: 'whatsapp',
    match: (u) => u.startsWith('/messages') || u.startsWith('/commandes/'),
  },
  {
    path: '/finances',
    label: 'Finances',
    short: 'Finances',
    icon: 'banknote',
    match: (u) => u.startsWith('/finances'),
  },
  {
    path: '/stock',
    label: 'Stock & marges',
    short: 'Stock',
    icon: 'coffee',
    match: (u) => u.startsWith('/stock'),
  },
];

const MOBILE_TITLES: [RegExp, string][] = [
  [/^\/commandes\//, 'Commande'],
  [/^\/messages/, 'Messages IA'],
  [/^\/finances/, 'Finances'],
  [/^\/stock/, 'Stock & marges'],
];

const ROLE_LABEL = { ADMIN: 'Administrateur', AGENT: 'Agent commercial' } as const;

/**
 * Gabarit commun du back-office : barre latérale 240px (≥ 768px) ;
 * en dessous, barre du haut + barre d'onglets (C5).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon, Wordmark, ToastOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-dvh bg-surface text-ink font-sans',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly stockApi = inject(StockApi);
  protected readonly state = inject(AppState);
  protected readonly theme = inject(ThemeService);

  protected readonly nav = NAV;
  protected readonly markSrc = 'assets/logos/shiftcart-mark.png';
  protected readonly wordmarkSrc = 'assets/logos/shiftcart-wordmark.png';
  protected readonly menuOpen = signal(false);

  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly user = this.auth.user;
  protected readonly userName = computed(() => this.user()?.name ?? '');
  protected readonly userInitials = computed(() => initials(this.userName() || 'Admin'));
  protected readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABEL[role] : '';
  });

  protected readonly mobileTitle = computed(() => {
    const u = this.url();
    return MOBILE_TITLES.find(([re]) => re.test(u))?.[1] ?? 'Commandes';
  });

  protected readonly stockAlert = computed(() => {
    const s = this.state.stock();
    return s?.alert ? s : null;
  });

  constructor() {
    this.stockApi
      .get()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) => this.state.stock.set(s),
        error: () => {
          // Alerte de stock non bloquante : l'écran Stock affiche sa propre erreur.
        },
      });
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.state.mobileSubtitle.set('');
      });
  }

  protected isActive(item: NavItem): boolean {
    return item.match(this.url());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected logout(): void {
    void this.auth.logout();
  }
}
