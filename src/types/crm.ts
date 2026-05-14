export type LeadStatus = 'NEW' | 'CONTACTED' | 'REPLIED' | 'QUALIFIED' | 'WON' | 'LOST';

export interface Lead {
    id: string;
    pharmacy_name: string;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website_url: string;
    city: string;
    has_webshop: boolean;
    shop_url?: string | null;
    has_ai_products: boolean;
    has_ai_chatbot: boolean;
    notes?: string | null;
    tags: string[];
    status: LeadStatus;
    google_place_id?: string | null;
    source?: 'GMaps' | 'local.ch';
    overall_score?: number | null;
    category_scores?: any | null;
    created_at: string;
    updated_at: string;
    last_scanned?: string | null;
}

export interface Survey {
    id: string;
    title: string;
    intro_text: string;
    company_name: string;
    company_contact: string;
    consent_text: string;
    created_at: string;
}

export interface SurveyResponse {
    id: string;
    survey_id: string;
    lead_id?: string | null;
    has_website: boolean;
    website_satisfaction?: number | null;
    webshop_status: 'Yes' | 'No' | 'Planned';
    it_management: 'in-house' | 'agency' | 'freelancer' | 'not sure';
    ai_usage: 'None' | 'Internal' | 'Chatbot' | 'Both';
    top_priority: string;
    top_priority_other?: string | null;
    contact_name: string;
    email: string;
    phone?: string | null;
    consent_accepted: boolean;
    created_at: string;
}

export interface NewsletterSignup {
    id: string;
    email: string;
    pharmacy_name?: string | null;
    lead_id?: string | null;
    consent_accepted: boolean;
    created_at: string;
}

export interface CRMAnalytics {
    totalLeads: number;
    leadsByStatus: Record<LeadStatus, number>;
    withWebshop: number;
    withChatbot: number;
    qualifiedLeads: number;
}
