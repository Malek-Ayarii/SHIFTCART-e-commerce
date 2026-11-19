import type { IconName } from '../ui/icon';

/** Icône de chaque agent (l'identité = icône + nom, jamais la couleur seule). */
export const AGENT_ICONS: Record<string, IconName> = {
  assistant: 'sparkles',
  social: 'megaphone',
  content: 'penLine',
  design: 'palette',
  developer: 'code',
  security: 'shield',
  sales: 'handCoins',
  finance: 'landmark',
};

export function agentIcon(key: string | null | undefined): IconName {
  return (key && AGENT_ICONS[key]) || 'bot';
}

/** Idées de questions de l'état vide, avec l'agent qui les reçoit (absent = l'assistant oriente). */
export interface AgentPrompt {
  text: string;
  agent?: string;
  hint: string;
}

export const AGENT_PROMPTS: readonly AgentPrompt[] = [
  {
    text: 'Prépare une campagne TikTok pour le Pack Setup & Productivité : idées de vidéos, textes et visuels.',
    hint: 'Assistant · social, contenu, design',
  },
  {
    text: 'Comment se passe ce mois-ci par rapport au précédent, et que faire cette semaine pour vendre plus ?',
    agent: 'sales',
    hint: 'Sales manager',
  },
  {
    text: 'Quelle est la marge réelle de chaque pack après frais transporteur ?',
    agent: 'finance',
    hint: 'Finance manager',
  },
  {
    text: "Réécris l'accroche du Pack Barista pour des étudiants en période d'examens.",
    agent: 'content',
    hint: 'Content manager',
  },
  {
    text: 'Quels risques de fraude sur le paiement à la livraison, et comment les réduire ?',
    agent: 'security',
    hint: 'Security manager',
  },
  {
    text: 'Propose une direction visuelle pour les Stories du Pack Meal Prep.',
    agent: 'design',
    hint: 'Design manager',
  },
];
