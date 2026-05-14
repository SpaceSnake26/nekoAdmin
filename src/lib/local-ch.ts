import * as cheerio from 'cheerio';

export interface LocalChLead {
    name: string;
    website?: string;
    phone?: string;
    address?: string;
    city?: string;
    source: 'local.ch';
    place_id?: string;
}

// Helper to gracefully backoff if we hit the free-tier API rate limits (429)
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        const response = await fetch(url);
        if (response.status === 429) {
            console.warn(`[Local.ch] 429 Too Many Requests. Backing off for ${2000 * (i + 1)}ms...`);
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            continue;
        }
        return response;
    }
    return fetch(url); // Final attempt
}

export async function searchLocalCh(query: string = 'Apotheke', isGlobal: boolean = false): Promise<LocalChLead[]> {
    console.log(`[Local.ch] Fetching from API for "${query}", isGlobal: ${isGlobal}...`);
    const apiKey = '0506b0582c68ca7fe6372045fcd159ff';
    const allResults: LocalChLead[] = [];
    const maxnum = 100;

    const queries = isGlobal ? ['Apotheke', 'Pharmacie', 'Farmacia'] : [query];

    for (const q of queries) {
        if (isGlobal) {
            // The API blocks queries returning more than 200 results (401 error).
            // To natively bypass this for a global scan across all 3 languages,
            // we use a recursive postal-code wildcard slice (e.g., 8*, 80*, 800*).
            const queue = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

            while (queue.length > 0) {
                const prefix = queue.shift()!;
                const wo = `${prefix}*`;

                try {
                    await new Promise(r => setTimeout(r, 300)); // Polite throttle

                    // Check total results for this prefix
                    const countUrl = `https://search.ch/tel/api/?was=${encodeURIComponent(q)}&wo=${encodeURIComponent(wo)}&key=${apiKey}&maxnum=1`;
                    const countRes = await fetchWithRetry(countUrl);

                    if (!countRes.ok) {
                        console.error(`[Local.ch] Count API Error for ${wo}: ${countRes.status}`);
                        continue;
                    }
                    const countXml = await countRes.text();
                    const $count = cheerio.load(countXml, { xmlMode: true });
                    const totalResults = parseInt($count('openSearch\\:totalResults').text() || '0');

                    if (totalResults === 0) {
                        continue;
                    }

                    // If it exceeds the 200 hard-limit, split it recursively down a level
                    if (totalResults > 200 && prefix.length < 4) {
                        console.log(`[Local.ch] ${q} in ${wo} has ${totalResults} (>200) results. Splitting into deeper ZIPs...`);
                        for (let i = 0; i <= 9; i++) {
                            queue.push(`${prefix}${i}`);
                        }
                        continue;
                    }

                    // Proceed to fetch all safely chunked results
                    console.log(`[Local.ch] Fetching safely chunked ${totalResults} results for ${q} in ${wo}...`);
                    for (let page = 0; page < 3; page++) { // Max 300 results as total <= 200 is guaranteed
                        const pos = page * maxnum + 1;
                        if (pos > totalResults && page > 0) break;

                        await new Promise(r => setTimeout(r, 300)); // Polite throttle
                        const fetchUrl = `https://search.ch/tel/api/?was=${encodeURIComponent(q)}&wo=${encodeURIComponent(wo)}&key=${apiKey}&maxnum=${maxnum}&pos=${pos}`;
                        const res = await fetchWithRetry(fetchUrl);
                        if (!res.ok) break;

                        const xmlData = await res.text();
                        const pageResults = parseCheerioXml(xmlData);
                        if (pageResults.length === 0) break;

                        allResults.push(...pageResults);

                        if (pageResults.length < maxnum) break; // Reached end
                    }
                } catch (err) {
                    console.error(`[Local.ch] Error processing queue item ${wo}:`, err);
                }
            }
        } else {
            // Standard single query fetch (e.g. city-specific)
            console.log(`[Local.ch] Standard search for "${q}"`);
            for (let page = 0; page < 3; page++) {
                const pos = page * maxnum + 1;
                try {
                    const fetchUrl = `https://search.ch/tel/api/?was=${encodeURIComponent(q)}&key=${apiKey}&maxnum=${maxnum}&pos=${pos}`;
                    const res = await fetch(fetchUrl);
                    if (!res.ok) break;

                    const xmlData = await res.text();
                    const pageResults = parseCheerioXml(xmlData);
                    if (pageResults.length === 0) break;

                    allResults.push(...pageResults);

                    if (pageResults.length < maxnum) break;
                } catch (err) {
                    console.error(`[Local.ch] Error standard fetch page ${page + 1}:`, err);
                    break;
                }
            }
        }
    }

    // Deduplicate cross-language overlapping pharmacies strictly by place_id
    const uniqueIds = new Set<string>();
    const uniqueResults = allResults.filter(lead => {
        if (!lead.place_id) return true;
        if (uniqueIds.has(lead.place_id)) return false;
        uniqueIds.add(lead.place_id);
        return true;
    });

    console.log(`[Local.ch] Finished all queries. Total unique results found: ${uniqueResults.length}`);
    return uniqueResults;
}

function parseCheerioXml(xmlData: string): LocalChLead[] {
    const $ = cheerio.load(xmlData, { xmlMode: true });
    const entries = $('entry');
    const results: LocalChLead[] = [];

    entries.each((_, el) => {
        const entry = $(el);

        const getText = (tag: string) => {
            let val = '';
            entry.find('*').each((_, node) => {
                const nodeName = (node as any).name || (node as any).tagName;
                if (nodeName === tag && !val) {
                    val = $(node).text().trim();
                }
            });
            return val;
        };

        const name = getText('tel:name') || getText('title');
        const street = getText('tel:street');
        const streetno = getText('tel:streetno');
        const city = getText('tel:city');
        const phone = getText('tel:phone');
        let place_id = getText('tel:id') || getText('id');

        if (place_id.startsWith('urn:uuid:')) {
            place_id = place_id.replace('urn:uuid:', '');
        }

        let website = '';
        entry.find('*').each((_, node) => {
            const n = $(node);
            const nodeName = (node as any).name || (node as any).tagName;

            if (nodeName === 'tel:extra' && n.attr('type') === 'website') {
                const txt = n.text().trim();
                const idx = txt.indexOf('http');
                if (idx !== -1) {
                    website = txt.substring(idx);
                } else if (!website) {
                    website = txt;
                }
            }
        });

        if (!website) {
            entry.find('link[type="text/html"][rel="alternate"]').each((_, linkEl) => {
                const href = $(linkEl).attr('href');
                if (href && !href.includes('search.ch') && !website) {
                    website = href;
                }
            });
        }

        if (name) {
            results.push({
                name,
                phone: phone || undefined,
                address: street ? `${street} ${streetno}`.trim() : undefined,
                city: city || undefined,
                website: website || undefined,
                source: 'local.ch',
                place_id: place_id || undefined
            });
        }
    });

    return results;
}
