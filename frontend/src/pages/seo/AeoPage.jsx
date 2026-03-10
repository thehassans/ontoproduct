import React, { useState } from 'react';
import { checkAiSummaryStructure, validateLdJsonSchema, generateLlmsTxt } from '../../utils/geoAeoOptimizer';

export default function AeoPage() {
  const [contentToAnalyze, setContentToAnalyze] = useState('');
  const [schemaToAnalyze, setSchemaToAnalyze] = useState('{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Example"\n}');
  
  const [summaryResult, setSummaryResult] = useState(null);
  const [schemaResult, setSchemaResult] = useState(null);
  const [llmsText, setLlmsText] = useState('');

  const handleAnalyzeContent = () => {
    const hasSummary = checkAiSummaryStructure(contentToAnalyze);
    setSummaryResult({
      status: hasSummary ? 'success' : 'warning',
      msg: hasSummary 
        ? 'Pass! Dense AI Summary detected early in the content.' 
        : 'Warning: Missing dense bulleted summary in the first 500 characters. Answer Engines may skip this.'
    });
  };

  const handleAnalyzeSchema = () => {
    const result = validateLdJsonSchema(schemaToAnalyze);
    setSchemaResult(result);
  };

  const handleGenerateLlms = () => {
    const txt = generateLlmsTxt({
      url: 'https://buysial.com',
      brandName: 'Buysial',
      description: 'Premium e-commerce destination for authentic skincare and hardware products in the GCC.',
      keyEndpoints: [
        { name: 'Products Catalog', url: 'https://buysial.com/catalog', desc: 'Full inventory' },
        { name: 'Categories API', url: 'https://api.buysial.com/categories', desc: 'JSON list of categories' }
      ]
    });
    setLlmsText(txt);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Answer Engine Optimization (AEO)</h1>
        <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-2xl">
          Optimize your content structures for Google AI Overviews, ChatGPT, and Perplexity by enforcing strict citation formats, robust LD-JSON schemas, and AI-first `llms.txt` endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Section 1: Content Analyzer */}
          <section className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">1</span> 
              AI Summary Extractor Check
            </h2>
            <textarea 
              className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm bg-white mb-3"
              placeholder="Paste product overview or article content here to check for Answer Engine quotability..."
              value={contentToAnalyze}
              onChange={(e) => setContentToAnalyze(e.target.value)}
            />
            <button onClick={handleAnalyzeContent} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95">
              Analyze Structure
            </button>
            
            {summaryResult && (
              <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 border ${summaryResult.status === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <div className="mt-0.5">{summaryResult.status === 'success' ? '✅' : '⚠️'}</div>
                <p className="text-sm font-medium">{summaryResult.msg}</p>
              </div>
            )}
          </section>

          {/* Section 2: JSON-LD Schema */}
          <section className="bg-gray-50 rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-black">2</span> 
              Schema Strict Validation
            </h2>
            <p className="text-xs text-gray-500 mb-4 ml-10">Validates against deprecated schemas (like HowTo) which AI bots frequently ignore.</p>
            <textarea 
              className="w-full h-40 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 text-sm font-mono bg-white mb-3"
              value={schemaToAnalyze}
              onChange={(e) => setSchemaToAnalyze(e.target.value)}
            />
            <button onClick={handleAnalyzeSchema} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95">
              Validate Schema
            </button>
            
            {schemaResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm border ${schemaResult.isValid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <p className="font-bold flex items-center gap-2 mb-2">
                  {schemaResult.isValid ? '✅ Schema is Optimized' : '❌ Restructuring Required'}
                </p>
                <p className="text-gray-700"><strong>Found Types:</strong> {schemaResult.foundTypes.join(', ') || 'None'}</p>
                {schemaResult.deprecated.length > 0 && <p className="text-red-600 mt-1"><strong>Deprecated:</strong> {schemaResult.deprecated.join(', ')}</p>}
              </div>
            )}
          </section>

        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Section 3: LLMs.txt generator */}
          <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-sm font-black">3</span> 
              Endpoint Generator (llms.txt)
            </h2>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Answer Engines look for a standard `llms.txt` file at the root of your domain. Generate an optimized markdown map of your site specifically for AI bots.
            </p>
            
            <button onClick={handleGenerateLlms} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all w-full active:scale-[0.98] mb-4">
              Generate llms.txt Reference
            </button>

            {llmsText && (
              <div className="relative">
                <div className="absolute top-3 right-3">
                  <button onClick={() => navigator.clipboard.writeText(llmsText)} className="text-xs font-bold bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:bg-white text-gray-700">
                    Copy
                  </button>
                </div>
                <pre className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/40 text-xs font-mono text-gray-800 whitespace-pre-wrap h-[300px] overflow-y-auto shadow-inner">
                  {llmsText}
                </pre>
              </div>
            )}
          </section>

        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
