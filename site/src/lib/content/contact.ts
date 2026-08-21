/**
 * The enquiry form's option lists.
 *
 * Templates read from here, never from `astro:content` directly, so the
 * content source stays swappable. [P7, ADR-0002]
 */
import { getEntry } from 'astro:content';

export interface Option {
  value: string;
  label: string;
}
export interface IntentOption extends Option {
  note: string;
}
export interface TimingOptions {
  /** Year chips, computed at build time — never a stale hardcoded list. */
  years: string[];
  /** The chip that greys out the month grid. */
  flexibleLabel: string;
  months: string[];
}
export interface ContactFormOptions {
  intents: IntentOption[];
  outputs: Option[];
  budgets: Option[];
  pronouns: Option[];
  timing: TimingOptions;
}

export async function getContactFormOptions(): Promise<ContactFormOptions> {
  const entry = await getEntry('contactForm', 'form');
  if (!entry) {
    throw new Error(
      'src/content/contact/form.yaml is missing. The enquiry form cannot render without its options.',
    );
  }
  const { intents, outputs, budgets, pronouns, timing } = entry.data;

  // Derived, not stored: a hardcoded year list silently starts offering a
  // year that has already passed. See the note in form.yaml.
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: timing.yearsAhead + 1 }, (_, i) => String(thisYear + i));

  return {
    intents,
    outputs,
    budgets,
    pronouns,
    timing: { years, flexibleLabel: timing.flexibleLabel, months: timing.months },
  };
}
