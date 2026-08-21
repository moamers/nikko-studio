/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Source: src/content/email/copy.yaml
 * Regenerate: npm run enquiry:email-copy   (also runs as part of npm run build)
 *
 * The email builder runs in a Worker and cannot read YAML at request time,
 * so Nadia's editable copy is compiled into this module instead. Editing
 * this file by hand will be overwritten and will fail the unit tests.
 */

export interface EmailCopy {
  readonly brand: {
    readonly name: string;
    readonly locations: string;
    readonly masthead: string;
    readonly website_label: string;
  };
  readonly sections: {
    readonly about_you: string;
    readonly project: string;
    readonly reason: string;
    readonly finish_line: string;
  };
  readonly fields: {
    readonly business: string;
    readonly name: string;
    readonly email: string;
    readonly social: string;
    readonly pronouns: string;
    readonly accessibility: string;
    readonly movement: string;
    readonly outputs: string;
    readonly why: string;
    readonly goals: string;
    readonly target_timing: string;
    readonly budget: string;
    readonly budget_short: string;
    readonly intent: string;
    readonly target_short: string;
  };
  readonly customer: {
    readonly subject: string;
    readonly preheader_prefix: string;
    readonly preheader_suffix: string;
    readonly status: string;
    readonly headline_line_1: string;
    readonly headline_line_2: string;
    /** The enquirer's first name is substituted for {name} at send time. */
    readonly greeting: string;
    readonly intro: string;
    readonly support: string;
  };
  readonly owner: {
    readonly subject_prefix: string;
    readonly preheader_suffix: string;
    readonly status: string;
    readonly headline_line_1: string;
    readonly headline_line_2: string;
    readonly reply_label: string;
  };
}

export const EMAIL_COPY: EmailCopy = {
  brand: {
    name: "NIKKO STUDIO",
    locations: "LONDON // DUBAI",
    masthead: "NIKKO STUDIO / LONDON / DUBAI",
    website_label: "NIKKOSTUDIO.CO",
  },
  sections: {
    about_you: "About you",
    project: "The project",
    reason: "The reason",
    finish_line: "The finish line",
  },
  fields: {
    business: "Business",
    name: "Name",
    email: "Email",
    social: "Social / website",
    pronouns: "Pronouns",
    accessibility: "Access / adjustments",
    movement: "Closest fit",
    outputs: "What we're making",
    why: "What's changing",
    goals: "Success looks like",
    target_timing: "Target timing",
    budget: "Ballpark budget",
    budget_short: "Budget",
    intent: "Intent",
    target_short: "Target",
  },
  customer: {
    subject: "We’ve got your project brief",
    preheader_prefix: "Thanks,",
    preheader_suffix: "— here is a copy of the brief you sent to Nikko Studio.",
    status: "Brief received",
    headline_line_1: "Your project",
    headline_line_2: "brief is in.",
    greeting: "Hi",
    intro: "thanks for taking the time to tell us what you’re working on. We’ll read through it properly and get back to you within two working days.",
    support: "Here’s a copy of everything you submitted. If something is wrong or you have more to add, just reply to this email.",
  },
  owner: {
    subject_prefix: "New project brief —",
    preheader_suffix: "sent a new project brief.",
    status: "New enquiry",
    headline_line_1: "A new brief",
    headline_line_2: "just landed.",
    reply_label: "Reply to",
  },
};
