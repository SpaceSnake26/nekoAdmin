import { z } from 'zod';

export const leadStatusSchema = z.enum(['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'WON', 'LOST']);

export const leadSchema = z.object({
    pharmacy_name: z.string().min(1, "Pharmacy name is required"),
    contact_name: z.string().optional().nullable(),
    email: z.string().email("Invalid email address").optional().nullable(),
    phone: z.string().optional().nullable(),
    website_url: z.string().url("Invalid website URL"),
    city: z.string().min(1, "City is required"),
    has_webshop: z.boolean().default(false),
    shop_url: z.string().url("Invalid shop URL").optional().nullable(),
    has_ai_products: z.boolean().default(false),
    has_ai_chatbot: z.boolean().default(false),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).default([]),
    status: leadStatusSchema.default('NEW'),
});

export const surveyResponseSchema = z.object({
    survey_id: z.string().uuid(),
    lead_id: z.string().uuid().optional().nullable(),
    has_website: z.boolean(),
    website_satisfaction: z.number().min(1).max(5).optional().nullable(),
    webshop_status: z.enum(['Yes', 'No', 'Planned']),
    it_management: z.enum(['in-house', 'agency', 'freelancer', 'not sure']),
    ai_usage: z.enum(['None', 'Internal', 'Chatbot', 'Both']),
    top_priority: z.string().min(1, "Priority is required"),
    top_priority_other: z.string().optional().nullable(),
    contact_name: z.string().min(1, "Contact name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional().nullable(),
    consent_accepted: z.boolean().refine(val => val === true, "Consent is required"),
});

export const newsletterSignupSchema = z.object({
    email: z.string().email("Invalid email address"),
    pharmacy_name: z.string().optional().nullable(),
    lead_id: z.string().uuid().optional().nullable(),
    consent_accepted: z.boolean().refine(val => val === true, "Consent is required"),
});
