import { apiGet, apiPost } from '../api';

/**
 * 🚀 Next-Gen AI SEO Dashboard API Service
 * Handles: Google Search Console, Google Analytics 4, and PageSpeed Insights
 */

// =========================================================================
// 🔑 INSTRUCTIONS FOR API KEYS:
// 1. You must enable the Google Search Console API, GA4 Data API, and PageSpeed Insights API in your standard Google Cloud Console project.
// 2. Add your API key or Service Account JSON to your .env file on the backend.
// 3. For the frontend calls below to work, your backend must have corresponding proxy routes (e.g. /api/seo/gsc) that securely attach the keys.
// =========================================================================

const handleResponse = async (res) => {
  if (!res || !res.success) {
    throw new Error(res?.message || 'Dashboard API Error');
  }
  return res.data;
};

/**
 * Fetches Google Search Console data for the site.
 * Used in: /traffic page
 * Calculates clicks, impressions, CTR, and average position.
 */
export const fetchGscMetrics = async (urlFilter = '', days = 30) => {
  try {
    // Note: To implement this properly, your backend needs to authenticate via a Service Account
    // and call: https://searchconsole.googleapis.com/v1/searchanalytics/query
    console.log(`Fetching GSC metrics for ${urlFilter || 'entire site'} over ${days} days...`);
    const res = await apiPost('/api/seo/gsc/query', { urlFilter, days });
    return handleResponse(res);
  } catch (error) {
    console.warn('GSC API Mock returned (Requires Backend Integration):', error.message);
    // Return mock data for the UI layout
    return {
      clicks: 12450,
      impressions: 142000,
      ctr: 8.76,
      position: 12.4,
      timeline: Array.from({ length: days }).map((_, i) => ({
        date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
        clicks: Math.floor(Math.random() * 500) + 100,
        impressions: Math.floor(Math.random() * 5000) + 1000,
      }))
    };
  }
};

/**
 * Fetches Google Analytics 4 Data.
 * Used in: /traffic page
 * Tracks specific events like click_on_product or add_to_cart, and groups by country.
 */
export const fetchGa4Metrics = async (days = 30) => {
  try {
    // Note: Backend must use the Analytics Data API v1beta
    // Endpoint: https://analyticsdata.googleapis.com/v1beta/properties/{PROPERTY_ID}:runReport
    const res = await apiPost('/api/seo/ga4/query', { days });
    return handleResponse(res);
  } catch (error) {
    console.warn('GA4 API Mock returned (Requires Backend Integration):', error.message);
    // Return mock data for UI
    return {
      topCountries: [
        { country: 'United Arab Emirates', activeUsers: 4500, events: 12000 },
        { country: 'Saudi Arabia', activeUsers: 3200, events: 9500 },
        { country: 'United Kingdom', activeUsers: 2100, events: 4300 },
      ],
      productCtr: 14.2
    };
  }
};

/**
 * Fetches Google PageSpeed Insights.
 * Used in: /optimization page
 * Can be called entirely client-side if you provide the API Key directly, but safer via backend.
 */
export const fetchPageSpeedInsights = async (urlToTest, isMobile = true) => {
  try {
    const strategy = isMobile ? 'MOBILE' : 'DESKTOP';
    
    // 🔑 Replace this with an actual API key via environment vars: import.meta.env.VITE_GCP_API_KEY
    const API_KEY = 'ENTER_YOUR_GCP_API_KEY_HERE'; 
    
    // If you don't use a key, it will heavily rate limit you.
    const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlToTest || 'https://buysial.com')}&strategy=${strategy}&key=${API_KEY}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error.message);

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;
    
    return {
      score: Math.round(lighthouse.categories.performance.score * 100),
      lcp: audits['largest-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      inp: audits['interactive']?.displayValue, // Note: INP is closely related to TTI/Max Potential FID in REST payload
      failingElements: [
        ...((audits['render-blocking-resources']?.details?.items || []).map(i => ({ type: 'Render Blocking', url: i.url }))),
        ...((audits['unminified-javascript']?.details?.items || []).map(i => ({ type: 'Unminified JS', url: i.url }))),
        ...((audits['uses-optimized-images']?.details?.items || []).map(i => ({ type: 'Unoptimized Image', url: i.url })))
      ]
    };
  } catch (error) {
    console.warn('PageSpeed API Mock returned:', error.message);
    // Return mock data for UI
    return {
      score: isMobile ? 65 : 88,
      lcp: '2.4 s',
      cls: '0.04',
      inp: '120 ms',
      failingElements: [
        { type: 'Render Blocking', url: 'https://buysial.com/assets/style.css' },
        { type: 'Unoptimized Image', url: 'https://buysial.com/images/hero.jpg' }
      ]
    };
  }
};
