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
        You are an expert e-commerce copywriter. Create premium, optimistic, and sales-driving content for a product based on the following details:
        
        Product Name: ${productName}
        Category: ${category}
        Additional Information: ${additionalInfo}
        
        Generate the following sections in JSON format:
        1. "shortDescription": A catchy, premium, and optimistic short description (2-3 sentences).
        2. "overview": A detailed and engaging product overview highlighting benefits and lifestyle appeal (2 paragraphs).
        3. "specifications": A clean, formatted list of technical specifications or key product details (e.g., Material, Size, Usage). Format as a single string with newlines.
        4. "attributes": An array of objects with "label" and "value" for key product attributes (e.g., [{"label": "Material", "value": "Cotton"}, ...]).
        5. "keyFeatures": An array of 4-6 strong selling points.
        
        Ensure the tone is "premium" and "optimistic".
        
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
    const prompt = `You are an elite SEO specialist and e-commerce growth expert with deep knowledge of Google's ranking algorithms, E-E-A-T, and international SEO.

Generate a complete, production-ready SEO package for this product:
Product Name: ${productName}
Category: ${category}
Description: ${description || 'Not provided'}
Target Markets: ${countriesList}
Website: ${baseUrl}

Return ONLY a single valid JSON object (no markdown fences, no explanation) with these exact keys:

{
  "seoTitle": "Primary keyword first, product name, brand signal — MUST be 50-60 chars, max 60",
  "slug": "primary-keyword-product-name-lowercase-hyphens",
  "seoDescription": "Start with primary keyword, include benefit, CTA (Shop/Discover/Get), 145-158 chars",
  "seoKeywords": "head keyword, long-tail 1, long-tail 2, modifier + keyword, location + keyword, intent keyword, brand + keyword, 8-12 total comma-separated",
  "ogTitle": "Social-optimised title, slightly more emotional/clickbait than seoTitle",
  "ogDescription": "Social sharing description — curiosity-gap, 100-130 chars",
  "canonicalUrl": "${baseUrl}/products/SLUG_HERE",
  "countrySeo": {
    "CountryName": {
      "metaTitle": "Localised title for this specific market, 50-60 chars",
      "metaDescription": "Market-specific description with local buying intent signals, 145-158 chars",
      "keywords": "local market specific keywords",
      "hreflang": "ISO639-ISO3166 e.g. en-AE or ar-AE"
    }
  },
  "backlinks": [
    { "url": "REAL_AUTHORITY_SITE_1/specific-article-path", "anchor": "primary keyword anchor text", "type": "dofollow", "status": "pending", "domainAuthority": "high", "notes": "why this site is relevant" },
    { "url": "REAL_AUTHORITY_SITE_2/category-review-page", "anchor": "brand + keyword anchor", "type": "dofollow", "status": "pending", "domainAuthority": "high", "notes": "why this site is relevant" },
    { "url": "REAL_AUTHORITY_SITE_3/article", "anchor": "long-tail keyword anchor", "type": "dofollow", "status": "pending", "domainAuthority": "medium", "notes": "why this site is relevant" },
    { "url": "REAL_QA_OR_FORUM_SITE/thread-about-product", "anchor": "question-based anchor", "type": "nofollow", "status": "pending", "domainAuthority": "high", "notes": "community link building" },
    { "url": "REAL_NEWS_OR_DIRECTORY_SITE/listing", "anchor": "brand name or naked URL", "type": "nofollow", "status": "pending", "domainAuthority": "medium", "notes": "citation and brand mention" }
  ],
  "siteUrl": "${baseUrl}"
}

SEO Rules:
- seoTitle: Put primary search keyword first. Include product name. End with brand if space allows. No fluff.
- slug: 3-6 words max, primary keyword first, no stop words, no numbers unless essential
- seoDescription: First word MUST be a keyword. Include exactly one CTA verb. Hit 150-158 chars.
- seoKeywords: Mix short-head (2 words), medium-tail (3 words), long-tail (4+ words). Include price/buy intent keywords.
- countrySeo: Generate an entry for EVERY country in [${countriesList}]. ALL fields (metaTitle, metaDescription, keywords) must be in ENGLISH for every country including Arabic markets (UAE, KSA, Saudi Arabia, Qatar, Bahrain, Kuwait, Oman). Use localised buying-intent signals in English (e.g. "in Dubai", "in Saudi Arabia", "UAE delivery"). Hreflang codes: en-AE for UAE, en-SA for KSA/Saudi Arabia, en-GB for UK, en-US for US, en-QA for Qatar, en-BH for Bahrain, en-KW for Kuwait, en-OM for Oman.
- canonicalUrl: Replace SLUG_HERE with the actual slug you generated
- backlinks: CRITICAL — use REAL, well-known, existing websites that are topically relevant to "${category}" and "${productName}". Examples of real sites by niche: Beauty/Skincare → allure.com, byrdie.com, healthline.com/beauty, cosmopolitan.com; Tech → techradar.com, cnet.com, rtings.com, tomsguide.com; Fashion → vogue.com, whowhatwear.com, harpersbazaar.com; Home → houzz.com, apartmenttherapy.com, bhg.com; Food → foodnetwork.com, seriouseats.com; Fitness → menshealth.com, womenshealthmag.com, livestrong.com; General Q&A → reddit.com, quora.com; General directories → trustpilot.com, g2.com. For UAE/KSA markets also include: khaleejtimes.com, gulfnews.com, arabianbusiness.com. Generate REAL domain names with plausible article paths, not placeholder text like "authority-blog.com". Each backlink must have a "notes" field explaining why that specific site and URL path is relevant to this product.
- siteUrl: Always "${baseUrl}"`;

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