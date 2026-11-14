import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage, apiErrorStatus } from '../../core/errors';
import { Button } from '../../ui/button';
import { Icon } from '../../ui/icon';
import { Wordmark } from '../../ui/wordmark';

/** /login — email + mot de passe (compte créé par l'API au premier démarrage). */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, Button, Icon, Wordmark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'min-h-dvh grid place-items-center bg-surface text-ink font-sans px-4 py-10' },
  template: `
    <main class="w-full max-w-md flex flex-col gap-6">
      <div class="flex items-center justify-center gap-2.5 self-center px-3 py-1.5 rounded-pill dark:bg-ink">
        <img src="assets/logos/shiftcart-mark.png" alt="" class="size-9" />
        <sc-wordmark src="assets/logos/shiftcart-wordmark.png" [height]="16" />
      </div>

      <form
        class="bg-surface-raised rounded-lg shadow-card p-6 md:p-8 flex flex-col gap-5"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
        aria-labelledby="login-title"
      >
        <div class="flex flex-col gap-1">
          <h1 id="login-title" class="m-0 text-display-lg">Connexion</h1>
          <p class="m-0 text-body-sm text-ink-muted">Back-office de l'équipe SHIFT CART.</p>
        </div>

        @if (serverError()) {
          <div role="alert" class="flex gap-2.5 items-start p-3.5 rounded-md bg-danger-soft text-ink text-body-sm">
            <span class="text-danger"><sc-icon name="alert" [size]="18" /></span>
            <span>{{ serverError() }}</span>
          </div>
        }

        <div class="flex flex-col gap-1.5">
          <label for="login-email" class="text-sm font-bold">Email</label>
          <input
            id="login-email"
            type="email"
            formControlName="email"
            autocomplete="username"
            inputmode="email"
            class="h-13 px-4 rounded-md border-[1.5px] bg-surface-raised text-ink text-base focus:border-ink"
            [class]="showError('email') ? 'border-danger' : 'border-line-strong'"
            [attr.aria-invalid]="showError('email')"
            [attr.aria-describedby]="showError('email') ? 'login-email-err' : null"
          />
          @if (showError('email')) {
            <p id="login-email-err" class="m-0 flex items-center gap-1.5 text-sm font-semibold text-danger">
              <sc-icon name="alert" [size]="16" />{{ emailError() }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="login-password" class="text-sm font-bold">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            class="h-13 px-4 rounded-md border-[1.5px] bg-surface-raised text-ink text-base focus:border-ink"
            [class]="showError('password') ? 'border-danger' : 'border-line-strong'"
            [attr.aria-invalid]="showError('password')"
            [attr.aria-describedby]="showError('password') ? 'login-password-err' : null"
          />
          @if (showError('password')) {
            <p id="login-password-err" class="m-0 flex items-center gap-1.5 text-sm font-semibold text-danger">
              <sc-icon name="alert" [size]="16" />Indique ton mot de passe.
            </p>
          }
        </div>

        <button scButton type="submit" variant="primary" size="md" [block]="true" [disabled]="loading()">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** ?redirect=/commandes/42 (lié par withComponentInputBinding). */
  readonly redirect = input<string | undefined>(undefined);

  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showError(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected emailError(): string {
    return this.form.controls.email.hasError('required')
      ? 'Indique ton email.'
      : "Cet email n'est pas valide.";
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) {
      const first = this.form.controls.email.invalid ? 'login-email' : 'login-password';
      document.getElementById(first)?.focus();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login({ email: email.trim(), password });
      const target = this.safeRedirect(this.redirect());
      await this.router.navigateByUrl(target);
    } catch (err) {
      const status = apiErrorStatus(err);
      this.serverError.set(
        status === 401
          ? apiErrorMessage(err, 'Email ou mot de passe incorrect.')
          : apiErrorMessage(err, 'Connexion impossible pour le moment. Réessaie dans un instant.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /** N'accepte qu'un chemin interne (pas d'URL externe). */
  private safeRedirect(target: string | undefined): string {
    if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/login')) {
      return '/';
    }
    return target;
  }
}
