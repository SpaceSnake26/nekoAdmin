import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export interface PharmacyLead {
    name: string;
    address: string;
    phone?: string;
    website?: string;
    place_id: string;
    latitude: number;
    longitude: number;
    city?: string;
}

export async function findPharmacies(city: string): Promise<PharmacyLead[]> {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key') {
        console.warn('Google Maps API Key not set');
        return [];
    }

    const queries = [
        `Apotheke in ${city}, Switzerland`,
        `pharmacie à ${city}, Suisse`,
        `Farmacia a ${city}, Svizzera`
    ];

    let allResults: PharmacyLead[] = [];

    for (const query of queries) {
        allResults = [...allResults, ...(await searchWithQuery(query))];
    }

    // Deduplicate and get details (phone/website) for each
    const uniqueLeads = Array.from(new Map(allResults.map(item => [item.place_id, item])).values());

    return Promise.all(uniqueLeads.map(lead => fetchPlaceDetails(lead.place_id, lead)));
}

export async function findPharmaciesGlobal(): Promise<PharmacyLead[]> {
    const globalQueries = [
        'Apotheke Schweiz',
        'Pharmacie Suisse',
        'Farmacia Svizzera'
    ];

    let allResults: PharmacyLead[] = [];
    for (const query of globalQueries) {
        allResults = [...allResults, ...(await searchWithQuery(query))];
    }

    const uniqueLeads = Array.from(new Map(allResults.map(item => [item.place_id, item])).values());
    console.log(`[GMaps] Found ${uniqueLeads.length} unique leads globally.`);

    return Promise.all(uniqueLeads.slice(0, 60).map(lead => fetchPlaceDetails(lead.place_id, lead)));
}

async function searchWithQuery(query: string): Promise<PharmacyLead[]> {
    if (!GOOGLE_MAPS_API_KEY) return [];
    try {
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/textsearch/json',
            {
                params: {
                    query: query,
                    key: GOOGLE_MAPS_API_KEY,
                    region: 'ch'
                }
            }
        );

        return response.data.results.map((r: any) => ({
            name: r.name,
            address: r.formatted_address,
            place_id: r.place_id,
            latitude: r.geometry.location.lat,
            longitude: r.geometry.location.lng,
            city: r.formatted_address.split(',').reverse()[1]?.trim() || 'Switzerland',
        }));
    } catch (error) {
        console.error(`Error searching for ${query}:`, error);
        return [];
    }
}

async function fetchPlaceDetails(placeId: string, lead: PharmacyLead): Promise<PharmacyLead> {
    try {
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    place_id: placeId,
                    fields: 'formatted_phone_number,website',
                    key: GOOGLE_MAPS_API_KEY
                }
            }
        );

        return {
            ...lead,
            phone: response.data.result?.formatted_phone_number,
            website: response.data.result?.website,
        };
    } catch (error) {
        console.error(`Error fetching details for ${placeId}:`, error);
        return lead;
    }
}
