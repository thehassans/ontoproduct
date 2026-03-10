import React, { useState } from 'react';
import { fetchPageSpeedInsights } from '../../services/seoDashboardApi';

export default function OptimizationPage() {
  const [urlToTest, setUrlToTest] = useState('https://buysial.com');
  const [deviceMap, setDeviceMap] = useState({ mobile: null, desktop: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDevice, setActiveDevice] = useState('mobile');

  const handleAnalyze = async () => {
    if (!urlToTest) return;
    setIsAnalyzing(true);
    
    try {
      // Analyze both mobile and desktop concurrently
      const [mobileData, desktopData] = await Promise.all([
        fetchPageSpeedInsights(urlToTest, true),
        fetchPageSpeedInsights(urlToTest, false)
      ]);
      
      setDeviceMap({
        mobile: mobileData,
        desktop: desktopData
      });
      
    } catch (err) {
      console.error('PageSpeed analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentData = deviceMap[activeDevice];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Core Web Vitals & Optimization</h1>
          <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-2xl">
            Google drastically prefers fast, stable pages. Analyze Interaction to Next Paint (INP), Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS) in real-time.
          </p>
        </div>
        
        {/* Input Bar */}
        <div className="flex w-full xl:w-auto gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <input 
            type="url" 
            value={urlToTest}
            onChange={(e) => setUrlToTest(e.target.value)}
            className="flex-1 w-full xl:w-64 px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="https://buysial.com/product/..."
          />
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors w-32 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Audit URL'}
          </button>
        </div>
      </div>

      {!currentData ? (
        <div className="bg-white border text-center border-dashed border-gray-300 rounded-[32px] p-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Ready to Analyze</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-md">Enter a specific product URL or your homepage above to fetch live Core Web Vitals from the Google PageSpeed Insights backend API.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Device Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-max">
            <button 
              onClick={() => setActiveDevice('mobile')} 
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeDevice === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mobile View
            </button>
            <button 
              onClick={() => setActiveDevice('desktop')} 
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeDevice === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Desktop View
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Speed Score Circle */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Performance Score</h2>
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Circular Progress */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className={currentData.score >= 90 ? 'stroke-green-500' : currentData.score >= 50 ? 'stroke-orange-500' : 'stroke-red-500'} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - currentData.score} strokeLinecap="round" />
                </svg>
                <div className="absolute flex items-center justify-center inset-0">
                  <span className={`text-5xl font-black ${currentData.score >= 90 ? 'text-green-600' : currentData.score >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                    {currentData.score}
                  </span>
                </div>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase mt-6 tracking-widest">
                {currentData.score >= 90 ? 'Excellent' : currentData.score >= 50 ? 'Needs Improvement' : 'Poor'}
              </p>
            </div>

            {/* Core Web Vitals Row */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <VitalCard label="LCP" activeColor="text-blue-600" bgColor="bg-blue-50" name="Largest Contentful Paint" value={currentData.lcp} target="< 2.5s" />
              <VitalCard label="CLS" activeColor="text-emerald-600" bgColor="bg-emerald-50" name="Cumulative Layout Shift" value={currentData.cls} target="< 0.1" />
              <VitalCard label="INP" activeColor="text-indigo-600" bgColor="bg-indigo-50" name="Interaction to Next Paint" value={currentData.inp} target="< 200ms" />
            </div>

          </div>

          {/* Diagnostic Checklist */}
          {currentData.failingElements && currentData.failingElements.length > 0 && (
            <div className="bg-red-50 rounded-3xl p-6 border border-red-100 mt-6">
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Diagnostic Checklist (Failing Elements)
              </h3>
              <div className="grid gap-3">
                {currentData.failingElements.map((el, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-red-100 flex items-center gap-4">
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded-lg w-32 shrink-0 text-center">{el.type}</span>
                    <span className="text-sm text-gray-600 font-mono truncate">{el.url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function VitalCard({ label, name, value, target, bgColor, activeColor }) {
  return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flexjustify-between items-start mb-2">
            <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${bgColor} ${activeColor}`}>{label}</span>
          </div>
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mt-4">{name}</h4>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black text-gray-900 tracking-tighter">{value || '--'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Target: {target}</p>
        </div>
      </div>
  );
}
