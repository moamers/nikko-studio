/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/content/contact/form.yaml
 * Regenerate: npm run enquiry:options   (also runs as part of npm run build)
 *
 * The enquiry validator runs in a Worker and cannot read YAML at request time,
 * so the founder-editable option list is compiled into this module instead.
 * Editing this file by hand will be overwritten and will fail the unit tests.
 */

export interface EnquiryOption {
  /** The stable code stored against a submission. */
  readonly value: string;
  /** What a person reads. Safe to reword; the value is not. */
  readonly label: string;
}

export const INTENTS: readonly EnquiryOption[] = [
  { value: "launch", label: "Launch something" },
  { value: "grow", label: "Grow something" },
  { value: "fix", label: "Fix something" },
  { value: "learn", label: "Learn something" },
] as const;

export const OUTPUTS: readonly EnquiryOption[] = [
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
  { value: "journey", label: "Customer journey" },
  { value: "campaign", label: "Campaign" },
  { value: "workshop", label: "Workshop / talk" },
  { value: "growth", label: "Growth strategy" },
  { value: "messaging", label: "Messaging & positioning" },
  { value: "surprise", label: "Surprise me" },
] as const;

export const BUDGETS: readonly EnquiryOption[] = [
  { value: "under-2k", label: "Under £2k" },
  { value: "2k-5k", label: "£2k – £5k" },
  { value: "5k-10k", label: "£5k – £10k" },
  { value: "10k-20k", label: "£10k – £20k" },
  { value: "20k-plus", label: "£20k+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const PRONOUNS: readonly EnquiryOption[] = [
  { value: "she", label: "She / her" },
  { value: "he", label: "He / him" },
  { value: "they", label: "They / them" },
  { value: "name", label: "Use my name" },
  { value: "private", label: "Prefer not to say" },
] as const;

/** This year plus N — the year chips are derived at request time, never stored. */
export const YEARS_AHEAD = 2;

/** The label of the chip that greys out the month grid. */
export const FLEXIBLE_LABEL = "Flexible";

/** The code submitted for that chip. Not in the YAML: it is a wire value. */
export const FLEXIBLE_YEAR = 'flexible';

export const MONTHS: readonly string[] = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
