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

  // Compatibility method for existing checks
  async ensureInitialized() {
    const key = await this.getApiKey();
    return !!key;
  }
}

// Export singleton instance
export default new GeminiService();