import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { unsavedChangesGuard } from './core/unsaved-changes.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion · SHIFT CART',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Tableau de bord · SHIFT CART',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'commandes/:id',
        title: 'Commande · SHIFT CART',
        loadComponent: () =>
          import('./pages/order-detail/order-detail-page').then((m) => m.OrderDetailPage),
      },
      {
        path: 'packs',
        title: 'Packs · SHIFT CART',
        loadComponent: () => import('./pages/packs/packs-page').then((m) => m.PacksPage),
      },
      {
        path: 'packs/new',
        title: 'Nouveau pack · SHIFT CART',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/pack-editor/pack-editor-page').then((m) => m.PackEditorPage),
      },
      {
        path: 'packs/:id',
        title: 'Éditer le pack · SHIFT CART',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./pages/pack-editor/pack-editor-page').then((m) => m.PackEditorPage),
      },
      {
        path: 'messages',
        title: 'Messages IA · SHIFT CART',
        loadComponent: () => import('./pages/messages/messages-page').then((m) => m.MessagesPage),
      },
      {
        path: 'finances',
        title: 'Finances · SHIFT CART',
        loadComponent: () => import('./pages/finances/finances-page').then((m) => m.FinancesPage),
      },
      {
        path: 'stock',
        title: 'Stock & marges · SHIFT CART',
        loadComponent: () => import('./pages/stock/stock-page').then((m) => m.StockPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
