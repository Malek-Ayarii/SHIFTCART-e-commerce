import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AGENT_PROMPTS, AgentPrompt, agentIcon } from '../../core/agents';
import { AgentsApi } from '../../core/api/agents.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import { formatDateTime, relativeAge } from '../../core/format';
import {
  AgentInfo,
  AgentMessage,
  AgentRoster,
  AgentThreadSummary,
  AgentTraceStep,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../ui/button';
import { ErrorState } from '../../ui/error-state';
import { Icon, IconName } from '../../ui/icon';
import { Markdown, plainText } from '../../ui/markdown';

/** Longueur max d'une question (identique à l'API). */
const MAX_CONTENT = 4000;

interface Pending {
  content: string;
  agent: string;
  startedAt: number;
}

/**
 * /agents — l'équipe d'agents IA : un assistant qui oriente et consulte 7 spécialistes.
 * Colonne gauche : équipe (destinataire) + conversations ; à droite : le fil, avec la trace de coordination.
 */
@Component({
  selector: 'app-agents-page',
  imports: [NgTemplateOutlet, Button, ErrorState, Icon, Markdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './agents-page.html',
})
export class AgentsPage {
  private readonly api = inject(AgentsApi);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  protected readonly state = inject(AppState);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');

  protected readonly maxContent = MAX_CONTENT;
  protected readonly prompts = AGENT_PROMPTS;
  protected readonly icon = agentIcon;
  protected readonly plain = plainText;

  // ---------- Équipe ----------
  protected readonly roster = signal<AgentRoster | null>(null);
  protected readonly rosterError = signal<string | null>(null);
  protected readonly assistant = computed(() => this.roster()?.agents.find((a) => a.coordinator) ?? null);
  protected readonly specialists = computed(() => this.roster()?.agents.filter((a) => !a.coordinator) ?? []);
  private readonly byKey = computed(() => new Map((this.roster()?.agents ?? []).map((a) => [a.key, a])));

  /** Destinataire : null = l'assistant oriente. */
  protected readonly recipient = signal<string | null>(null);
  protected readonly recipientInfo = computed(() => {
    const key = this.recipient();
    return key ? (this.byKey().get(key) ?? null) : this.assistant();
  });

  // ---------- Conversations ----------
  protected readonly threads = signal<AgentThreadSummary[]>([]);
  protected readonly threadsLoading = signal(true);
  protected readonly activeThread = signal<number | null>(null);
  protected readonly activeTitle = computed(
    () => this.threads().find((t) => t.id === this.activeThread())?.title ?? null,
  );
  protected readonly messages = signal<AgentMessage[]>([]);
  protected readonly threadLoading = signal(false);
  protected readonly threadError = signal<string | null>(null);
  protected readonly showThreadsMobile = signal(false);

  // ---------- Envoi ----------
  protected readonly draft = signal('');
  protected readonly pending = signal<Pending | null>(null);
  protected readonly sendError = signal<string | null>(null);
  protected readonly elapsed = signal(0);
  protected readonly openTraces = signal<ReadonlySet<number>>(new Set());
  protected readonly openAnswers = signal<ReadonlySet<string>>(new Set());

  protected readonly canSend = computed(() => {
    const d = this.draft().trim();
    return d.length > 0 && d.length <= MAX_CONTENT && !this.pending();
  });

  private ticker: ReturnType<typeof setInterval> | undefined;
  private sendSub?: Subscription;
  private threadSub?: Subscription;

  constructor() {
    this.loadRoster();
    this.loadThreads();
    this.state.mobileSubtitle.set('1 assistant · 7 spécialistes');
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.ticker);
      this.sendSub?.unsubscribe();
      this.threadSub?.unsubscribe();
    });
  }

  // ---------- Chargement ----------

  protected loadRoster(): void {
    this.rosterError.set(null);
    this.api.roster().subscribe({
      next: (r) => this.roster.set(r),
      error: (err) => this.rosterError.set(apiErrorMessage(err, "L'équipe d'agents n'a pas pu être chargée.")),
    });
  }

  private loadThreads(): void {
    this.threadsLoading.set(true);
    this.api.threads().subscribe({
      next: (list) => {
        this.threads.set(list);
        this.threadsLoading.set(false);
      },
      error: () => this.threadsLoading.set(false),
    });
  }

  protected openThread(id: number): void {
    if (this.pending()) return;
    this.activeThread.set(id);
    this.showThreadsMobile.set(false);
    this.threadLoading.set(true);
    this.threadError.set(null);
    this.sendError.set(null);
    this.threadSub?.unsubscribe();
    this.threadSub = this.api.thread(id).subscribe({
      next: (t) => {
        this.messages.set(t.messages);
        this.threadLoading.set(false);
        // Reprend avec l'agent de la dernière réponse s'il s'agissait d'un échange direct.
        const lastQuestion = [...t.messages].reverse().find((m) => m.role === 'user');
        this.recipient.set(lastQuestion && lastQuestion.agent !== 'assistant' ? lastQuestion.agent : null);
        this.scrollToEnd();
      },
      error: (err) => {
        this.threadLoading.set(false);
        this.threadError.set(apiErrorMessage(err, "La conversation n'a pas pu être chargée."));
      },
    });
  }

  protected newConversation(): void {
    if (this.pending()) return;
    this.activeThread.set(null);
    this.messages.set([]);
    this.threadError.set(null);
    this.sendError.set(null);
    this.showThreadsMobile.set(false);
    this.focusComposer();
  }

  protected deleteThread(t: AgentThreadSummary, event: Event): void {
    event.stopPropagation();
    if (this.pending()) return;
    this.api.remove(t.id).subscribe({
      next: () => {
        this.threads.update((list) => list.filter((x) => x.id !== t.id));
        if (this.activeThread() === t.id) this.newConversation();
        this.toast.success('Conversation supprimée.');
      },
      error: (err) => this.toast.error(apiErrorMessage(err, "La conversation n'a pas pu être supprimée.")),
    });
  }

  // ---------- Destinataire & suggestions ----------

  protected selectRecipient(key: string | null): void {
    this.recipient.set(key);
    this.focusComposer();
  }

  protected usePrompt(p: AgentPrompt): void {
    this.recipient.set(p.agent ?? null);
    this.draft.set(p.text);
    this.focusComposer();
  }

  // ---------- Envoi ----------

  protected onComposerKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  protected autosize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }

  protected send(): void {
    if (!this.canSend()) return;
    const content = this.draft().trim();
    const agent = this.recipient();
    const threadId = this.activeThread();
    this.pending.set({ content, agent: agent ?? 'assistant', startedAt: Date.now() });
    this.sendError.set(null);
    this.draft.set('');
    this.resetComposerHeight();
    this.startTicker();
    this.scrollToEnd();

    this.sendSub = this.api.ask(threadId, agent ? { content, agent } : { content }).subscribe({
      next: (ex) => {
        this.stopTicker();
        this.pending.set(null);
        if (threadId == null) {
          this.activeThread.set(ex.thread.id);
          this.messages.set([ex.question, ex.answer]);
        } else {
          this.messages.update((list) => [...list, ex.question, ex.answer]);
        }
        this.threads.update((list) => [ex.thread, ...list.filter((t) => t.id !== ex.thread.id)]);
        // La coordination est visible d'emblée sur la réponse qui vient d'arriver.
        if (ex.answer.trace.some((s) => s.type === 'consult')) {
          this.openTraces.update((s) => new Set(s).add(ex.answer.id));
        }
        // On lit la réponse depuis son début : la question remonte en haut du fil.
        this.scrollToMessage(ex.question.id);
      },
      error: (err) => {
        this.stopTicker();
        this.pending.set(null);
        this.draft.set(content);
        this.sendError.set(apiErrorMessage(err, "L'équipe n'a pas pu répondre. Réessaie."));
        this.focusComposer();
      },
    });
  }

  // ---------- Affichage ----------

  protected agentInfo(key: string | null | undefined): AgentInfo | null {
    return key ? (this.byKey().get(key) ?? null) : null;
  }

  protected agentLabel(key: string | null | undefined): string {
    if (!key) return 'Agent';
    return this.byKey().get(key)?.label ?? key;
  }

  protected iconOf(key: string | null | undefined): IconName {
    return agentIcon(key);
  }

  /** Spécialistes consultés directement par l'auteur de la réponse (profondeur 1), sans doublon. */
  protected consulted(m: AgentMessage): string[] {
    return [...new Set(m.trace.filter((s) => s.type === 'consult').map((s) => s.to ?? ''))].filter(Boolean);
  }

  protected reads(m: AgentMessage): number {
    return m.trace.filter((s) => s.type === 'data').length;
  }

  protected traceOpen(m: AgentMessage): boolean {
    return this.openTraces().has(m.id);
  }

  protected toggleTrace(m: AgentMessage): void {
    this.openTraces.update((s) => {
      const next = new Set(s);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }

  protected answerKey(m: AgentMessage, i: number): string {
    return `${m.id}:${i}`;
  }

  protected answerOpen(m: AgentMessage, i: number): boolean {
    return this.openAnswers().has(this.answerKey(m, i));
  }

  protected toggleAnswer(m: AgentMessage, i: number): void {
    const k = this.answerKey(m, i);
    this.openAnswers.update((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  protected stepIndent(s: AgentTraceStep): string {
    return s.depth >= 2 ? 'ml-8' : s.depth === 1 ? 'ml-0' : 'ml-0';
  }

  protected time(iso: string): string {
    return formatDateTime(iso);
  }

  protected age(iso: string): string {
    return relativeAge(iso);
  }

  protected pendingLine = computed(() => {
    const p = this.pending();
    if (!p) return '';
    if (p.agent === 'assistant') {
      const s = this.elapsed();
      if (s < 4) return "L'assistant lit ta question…";
      if (s < 12) return "L'assistant oriente ta question et consulte l'équipe si besoin…";
      return 'Les spécialistes travaillent et se concertent…';
    }
    return `${this.agentLabel(p.agent)} prépare sa réponse…`;
  });

  // ---------- Utilitaires ----------

  private startTicker(): void {
    this.elapsed.set(0);
    clearInterval(this.ticker);
    this.ticker = setInterval(() => {
      const p = this.pending();
      if (p) this.elapsed.set(Math.floor((Date.now() - p.startedAt) / 1000));
    }, 1000);
  }

  private stopTicker(): void {
    clearInterval(this.ticker);
    this.ticker = undefined;
  }

  private scrollToEnd(): void {
    afterNextRender(
      () => {
        const el = this.scroller()?.nativeElement;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }

  private scrollToMessage(id: number): void {
    afterNextRender(
      () => {
        const el = this.scroller()?.nativeElement.querySelector<HTMLElement>(`[data-msg="${id}"]`);
        el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }

  private focusComposer(): void {
    afterNextRender(
      () => {
        const el = this.composer()?.nativeElement;
        if (!el) return;
        el.focus();
        this.autosize(el);
      },
      { injector: this.injector },
    );
  }

  private resetComposerHeight(): void {
    const el = this.composer()?.nativeElement;
    if (el) el.style.height = 'auto';
  }
}
