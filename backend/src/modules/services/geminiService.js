import { GoogleGenAI } from '@google/genai';
import Setting from '../models/Setting.js'

class GeminiService {
  constructor() {
    this.client = null;
    this.defaultModel = 'gemini-2.5-flash';
  }

  async getApiKey() {
    try {
      const doc = await Setting.findOne({ key: 'ai' }).lean();
      return doc?.value?.geminiApiKey || process.env.GEMINI_API_KEY;
    } catch (err) {
      return process.env.GEMINI_API_KEY;
    }
  }

  async getModelName() {
    return 'gemini-2.5-flash';
  }

  async initClient() {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please add it in Settings > API Setup.');
    }
    
    this.client = new GoogleGenAI({ apiKey });
    console.log(`[GeminiService] Initialized with model: ${await this.getModelName()}`);
    return this.client;
  }

  async generateContent(prompt, maxRetries = 5) {
    if (!this.client) {
      await this.initClient();
    }
    
    const modelName = await this.getModelName();
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        return response.text;
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || '';
        const is503 = errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE');
        
        console.error(`[GeminiService] Attempt ${attempt}/${maxRetries} failed:`, errorMsg);
        
        if (is503 && attempt < maxRetries) {
          // Exponential backoff: 3s, 6s, 12s, 24s
          const waitTime = Math.pow(2, attempt) * 1500;
          console.log(`[GeminiService] Model overloaded, retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (!is503) {
          // Non-503 error, don't retry
          break;
        }
      }
    }
    
    // All retries failed - provide clear error message
    this.client = null;
    const errorMsg = lastError?.message || '';
    if (errorMsg.includes('503') || errorMsg.includes('overloaded')) {
      throw new Error('AI model is currently busy. Please try again in a few seconds.');
    }
    throw lastError;
  }

  async generateProductDescription(productName, category, additionalInfo = '') {
    try {
      const prompt = `
        You are an Elite SEO and GEO Content Strategist and Technical Writer. You operate strictly on the advanced architectural patterns for Answer Engine Optimization.
        
        Product Name: ${productName}
        Category: ${category}
        Additional Information: ${additionalInfo}
        
        Generate the following sections for this e-commerce product in JSON format.
        CRITICAL RULE: The frontend uses plain text areas. DO NOT use ANY Markdown formatting (NO **bold**, NO # headings, NO * italics). Use standard text, capitalization, and standard text bullet points (e.g., "• ") only.
        
        1. "shortDescription": A highly dense, bulleted "AI Summary" or "Key Takeaways" section. Outline the core entities, benefits, and specifications instantly using plain text bullets.
        2. "overview": Write authoritative, declarative content. You MUST format the most important definitive claims, benefits, and arguments into highly readable, standalone passages of EXACTLY 134 to 167 words. Treat brand mentions and semantic entity proximity as critical. Naturally weave the target brand, statistics, and highly related semantic entities throughout the plain text without keyword stuffing.
        3. "specifications": A clean, formatted list of technical specifications. Output as a clean plain-text list using "• " bullets.
        4. "attributes": An array of objects with "label" and "value" for key product attributes (e.g., [{"label": "Material", "value": "Cotton"}, ...]). Keep the values brief (1-4 words).
        5. "keyFeatures": An array of 4-6 strong, definitive selling points as plain text strings.
        
        Zero tolerance for doorway page tactics, fluff, or sensationalized clickbait. Ensure deep E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness).
        
        Return ONLY valid JSON.
      `;

      const text = await this.generateContent(prompt);

      // Try to parse JSON from the response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            description: parsed.shortDescription || parsed.description,
            overview: parsed.overview || '',
            specifications: parsed.specifications || '',
            attributes: Array.isArray(parsed.attributes) ? parsed.attributes : [],
            keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : []
          };
        } else {
          // Fallback
          return {
            description: text,
            overview: '',
            specifications: '',
            attributes: [],
            keyFeatures: []
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response', parseError);
        return {
          description: text,
          overview: '',
          specifications: '',
          attributes: [],
          keyFeatures: []
        };
      }
    } catch (error) {
      console.error('Error generating product description:', error);
      // Propagate the actual error message for better debugging on frontend
      throw new Error(error.message || 'Failed to generate product description');
    }
  }

  async generateProductTags(productName, category, description = '') {
    try {
      const prompt = `
        Generate relevant tags/keywords for this e-commerce product:
        
        Product Name: ${productName}
        Category: ${category}
        Description: ${description}
        
        Generate 8-12 relevant tags that customers might search for.
        Return as a JSON array of strings.
        Example: ["tag1", "tag2", "tag3"]
        
        Focus on:
        - Product type and category
        - Key features and benefits
        - Use cases and applications
        - Target audience
        - Material or style (if applicable)
      `;

      const text = await this.generateContent(prompt);

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: extract tags from text
          return text.split(',').map(tag => tag.trim().replace(/['"]/g, '')).slice(0, 10);
        }
      } catch (parseError) {
        console.warn('Failed to parse tags response');
        return [];
      }
    } catch (error) {
      console.error('Error generating product tags:', error);
      return [];
    }
  }

  async generateProductSEO(productName, category, description = '', availableCountries = [], baseUrl = 'https://buysial.com') {
    const countriesList = availableCountries.length > 0 ? availableCountries.join(', ') : 'UAE, KSA, UK, US';
    const prompt = `You are a world-class Elite SEO and GEO Content Strategist specialising in fast-ranking Google results AND Answer Engine Optimization (ChatGPT, Perplexity, Google AI Overviews).

PRODUCT DETAILS:
- Name: ${productName}
- Category: ${category}
- Description: ${description || 'Premium product'}
- Target Markets: ${countriesList}
- Store URL: ${baseUrl}

STRATEGY: Optimise for FAST RANKINGS using deep E-E-A-T triggers, and NO DEPRECATED SCHEMAS. 

Return ONLY a valid JSON object (no markdown, no explanation):

{
  "seoTitle": "50-60 chars max — primary keyword first, brand entity second",
  "slug": "3-5-word-hyphenated-slug",
  "seoDescription": "145-158 chars — lead with primary keyword, state top benefit, include buying signal, end with trust signal",
  "seoKeywords": "12-15 comma-separated core entities and latent semantic keywords",
  "ogTitle": "Emotionally compelling social title — benefit-first, 55-70 chars",
  "ogDescription": "Social sharing hook — open curiosity loop, mention key benefit, 100-125 chars",
  "canonicalUrl": "${baseUrl}/products/SLUG_HERE",
  "countrySeo": {
    "CountryName": {
      "metaTitle": "50-60 chars — localised long-tail keyword + product",
      "metaDescription": "145-158 chars — buying intent for this market",
      "keywords": "8-10 geo-targeted entities",
      "hreflang": "en-AE"
    }
  },
  "backlinks": [
    { "url": "https://REAL_DOMAIN.com/KNOWN_SECTION_PATH", "anchor": "long-tail keyword anchor", "type": "dofollow", "status": "pending", "domainAuthority": "high", "notes": "Brand entity co-occurrence focus" }
  ],
  "siteUrl": "${baseUrl}"
}

STRICT RULES — follow every rule or the output is wrong:

SEO TITLE: Must be < 60 characters. Primary long-tail BUYING keyword or Answer Engine prompt question first.
SLUG: 3-5 words, primary keyword first, all lowercase, hyphens only.

META DESCRIPTION: Count characters carefully. Must be 145-158 chars. First clause = primary keyword + benefit. Second clause = CTA ("Order now", "Shop today", "Free delivery UAE"). Third clause = trust signal ("Genuine product", "Fast shipping").

KEYWORDS: Include these 4 types — (A) short competitive: "japan sakura cream", "face cream UAE" — (B) buying-intent long-tail: "buy japan sakura cream online UAE", "best face moisturizer for dry skin KSA" — (C) question keywords: "which sakura cream is best for glowing skin", "where to buy authentic japan skincare in Dubai" — (D) geo-targeted: "japan sakura cream dubai", "sakura face cream riyadh delivery".

COUNTRY SEO: Generate entry for EVERY country in [${countriesList}]. ALL text in ENGLISH. Each country's metaTitle must include the country/city name and a buying intent word. Hreflang: en-AE (UAE), en-SA (KSA/Saudi Arabia), en-GB (UK), en-US (US), en-QA (Qatar), en-BH (Bahrain), en-KW (Kuwait), en-OM (Oman).

CANONICAL URL: Replace SLUG_HERE with the actual generated slug.

BACKLINKS — THIS IS AN OUTREACH TARGET LIST, NOT FAKE LINKS:
Use ONLY real, well-known domains that exist. Use ONLY their ROOT DOMAIN URL (e.g., https://www.allure.com). DO NOT append category paths (like /beauty or /skin), article paths, or fake IDs to guarantee no 404 errors.
Niche examples:
- Beauty/Skincare: https://www.allure.com, https://www.byrdie.com, https://www.healthline.com, https://www.cosmopolitan.com, https://www.self.com, https://www.vogue.com
- Fashion/Style: https://www.whowhatwear.com, https://www.harpersbazaar.com
- Tech: https://www.techradar.com, https://www.cnet.com, https://www.tomsguide.com  
- Home/Lifestyle: https://www.houzz.com, https://www.apartmenttherapy.com
- Health/Fitness: https://www.menshealth.com, https://www.womenshealthmag.com
- Q&A/Community: https://www.reddit.com, https://www.quora.com
- UAE/KSA Authority: https://gulfnews.com, https://www.khaleejtimes.com, https://www.arabianbusiness.com
- Review/Directory: https://www.trustpilot.com, https://www.google.com/maps
Use the root domain URL as the target — the "notes" field explains what content to pitch/create for that site.
Generate 5 backlinks, first 3 dofollow from niche authorities, last 2 nofollow from communities/directories.`;

    const text = await this.generateContent(prompt);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Failed to parse AI SEO response — please try again');
    }
  }

  // Compatibility method for existing checks
  async ensureInitialized() {
    const key = await this.getApiKey();
    return !!key;
  }
}

// Export singleton instance
export default new GeminiService();