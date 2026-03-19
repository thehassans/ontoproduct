import React, { useState } from 'react';
import { analyzePassageCitability, analyzeEntityCoOccurrence } from '../../utils/geoAeoOptimizer';

export default function GeoPage() {
  const [contentToAnalyze, setContentToAnalyze] = useState('');
  const [targetBrand, setTargetBrand] = useState('Buysial');
  
  const [passageResults, setPassageResults] = useState([]);
  const [entityResults, setEntityResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeGeo = async () => {
    if (!contentToAnalyze) return;
    setIsAnalyzing(true);
    
    // 1. Passage Citability
    const passages = analyzePassageCitability(contentToAnalyze);
    setPassageResults(passages);

    // 2. Entity Co-occurrence
    const entities = await analyzeEntityCoOccurrence(contentToAnalyze, targetBrand);
    setEntityResults(entities);
    
    setIsAnalyzing(false);
  };

  return (
    <div className="animate-fade-in p-6 sm:p-10 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Generative Engine Optimization (GEO)</h1>
        <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-2xl">
          Generative Engines (like ChatGPT & Google AI Overviews) extract "passages", not keywords. Optimize your text lengths (134-167 words) and semantic entity density to force AI crawlers to cite your brand.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Left Column: Input and Passage Highlighting */}
        <div className="space-y-6">
          <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Passage-Level Citability Tracker</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold">Optimal: 134-167 words</span>
              </div>
            </div>

            <textarea 
              className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 text-sm bg-gray-50 mb-3 leading-relaxed"
              placeholder="Paste article or description here to check if it's optimized for AI extraction..."
              value={contentToAnalyze}
              onChange={(e) => setContentToAnalyze(e.target.value)}
            />
            
            <div className="flex gap-4">
              <input 
                type="text"
                placeholder="Target Brand (e.g. Buysial)"
                className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-gray-900"
                value={targetBrand}
                onChange={e => setTargetBrand(e.target.value)}
              />
              <button 
                onClick={handleAnalyzeGeo} 
                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Run GEO Analysis'}
              </button>
            </div>
          </section>

          {/* Visual Highlight Output */}
          {passageResults.length > 0 && (
            <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full pointer-events-none" />
              <h3 className="text-sm font-black tracking-widest text-gray-400 uppercase mb-4 relative z-10">Citability Report</h3>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 relative z-10">
                {passageResults.map((p, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border transition-all ${p.isOptimal ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase">Passage {idx + 1}</span>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${p.isOptimal ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {p.wordCount} words {p.isOptimal && '✨ OPTIMAL'}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${p.isOptimal ? 'text-green-900 font-medium' : 'text-gray-600'}`}>
                      {p.text}
                    </p>
                    {!p.isOptimal && (
                      <p className="text-[11px] text-orange-500 font-bold mt-2">
                        {p.wordCount < 134 ? 'Too short for definitive AI citation. Expand context to 134+ words.' : 'Too long. Break this into smaller declarative paragraphs below 167 words.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Entity Co-Occurrence */}
        <div className="space-y-6">
          {entityResults && (
            <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Entity Co-Occurrence Engine</h2>
              <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                Generative rank is determined by the semantic proximity of your brand name to high-value industry entities.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/60 p-4 rounded-2xl border border-white">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Brand Density</span>
                  <span className={`text-2xl font-black ${entityResults.isOptimized ? 'text-indigo-600' : 'text-red-500'}`}>
                    {entityResults.brandDensity}%
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1 font-medium select-none">
                    Target: {'>'}0% and {'<'}3%
                  </p>
                </div>
                <div className="bg-white/60 p-4 rounded-2xl border border-white">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Brand Mentions</span>
                  <span className="text-2xl font-black text-gray-800">{entityResults.brandMatches}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top Extracted Entities</h3>
                <div className="space-y-2">
                  {entityResults.topEntities.map((ent, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white shadow-sm flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">{ent.name}</span>
                      <div className="flex items-center gap-2 w-1/2">
                        <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${ent.score}%` }} />
                        </div>
                        <span className="text-xs font-bold text-indigo-700 w-8 text-right">{ent.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}
