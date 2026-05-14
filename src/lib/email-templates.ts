"use strict";

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'cold-1',
        name: 'Cold Outreach #1 (IT Audit)',
        subject: 'Digitalisierung Ihrer Apotheke in {{city}}',
        body: `Grüezi {{contact_name}},

Wir unterstützen Schweizer Apotheken dabei, ihre digitale Präsenz zu modernisieren. Bei einer kurzen Analyse der {{pharmacy_name}} ist uns aufgefallen, dass es in Bereich Online-Bestellungen noch Optimierungspotenzial gibt.

Um Ihnen eine massgeschneiderte Analyse zu erstellen, haben wir ein kurzes 2-Minuten-Audit vorbereitet:
{{survey_link}}

Gerne besprechen wir die Ergebnisse anschliessend unverbindlich.

Beste Grüsse,
NekoLeads Team`
    },
    {
        id: 'followup-1',
        name: 'Follow-up #1 (7 Days)',
        subject: 'Re: Digitalisierung der {{pharmacy_name}}',
        body: `Grüezi {{contact_name}},

Ich wollte kurz nachhaken, ob Sie die Gelegenheit hatten, unser Audit für die {{pharmacy_name}} anzuschauen?

Link zum Audit: {{survey_link}}

In {{city}} sehen wir aktuell einen starken Trend hin zu KI-gestützten Kundenberatungen. Gerne zeigen wie Ihnen, wie das für Sie funktionieren kann.

Beste Grüsse,
NekoLeads Team`
    },
    {
        id: 'newsletter-welcome',
        name: 'Newsletter Welcome',
        subject: 'Willkommen beim Pharmacy-Digital Newsletter',
        body: `Grüezi {{contact_name}},

Willkommen bei unserem Newsletter für Schweizer Apotheken. Ab sofort erhalten Sie regelmässig Updates zu:
- E-Commerce Trends im Apothekenmarkt
- KI-Chatbots für die Kundenberatung
- Prozessoptimierung durch moderne IT

Wir freuen uns auf den Austausch!

Beste Grüsse,
NekoLeads Team`
    }
];

export function interpolateTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] || match;
    });
}
