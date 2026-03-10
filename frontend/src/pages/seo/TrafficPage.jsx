import React, { useState, useEffect } from 'react';
import { fetchGscMetrics, fetchGa4Metrics } from '../../services/seoDashboardApi';

export default function TrafficPage() {
  const [gscData, setGscData] = useState(null);
  const [ga4Data, setGa4Data] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [gsc, ga4] = await Promise.all([
          fetchGscMetrics('', 30),
          fetchGa4Metrics(30)
        ]);
        if (alive) {
          setGscData(gsc);
          setGa4Data(ga4);
        }
      } catch (err) {
        console.error('Failed to load traffic data:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-orange-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Syncing with Google APIs...</p>
      </div>
    );
  }

  // Find max value for SVG charting
  const maxImpressions = gscData ? Math.max(...gscData.timeline.map(d => d.impressions)) : 100;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Real-World Traffic & Analytics</h1>
        <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-2xl">
          Aggregated data directly from Google Search Console and Google Analytics 4 (GA4). Monitor impression growth and product-level click-through rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Impressions (30d)" value={gscData?.impressions?.toLocaleString() || '0'} trend="+12.4%" color="blue" />
        <MetricCard label="Total Clicks (30d)" value={gscData?.clicks?.toLocaleString() || '0'} trend="+5.2%" color="indigo" />
        <MetricCard label="Avg. Search Position" value={gscData?.position || '0.0'} trend="+1.1" color="emerald" reverse />
        <MetricCard label="Product CTR" value={`${ga4Data?.productCtr || '0.0'}%`} trend="+0.8%" color="orange" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Custom SVG Line Chart */}
        <section className="xl:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Impressions vs. Clicks (30 Days)</h2>
          <div className="h-64 flex items-end gap-1 relative pt-4">
            {/* Y-Axis Labeling */}
            <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] font-bold text-gray-400 pb-6 pointer-events-none">
              <span>{maxImpressions}</span>
              <span>{Math.floor(maxImpressions / 2)}</span>
              <span>0</span>
            </div>
            
            <div className="flex-1 flex items-end gap-[2px] h-full ml-10 pb-6 border-b border-gray-100 relative">
              {gscData && gscData.timeline.map((day, i) => {
                const heightPct = (day.impressions / maxImpressions) * 100;
                const clickHeightPct = (day.clicks / maxImpressions) * 100; // Scaled to same axis for simplicity
                return (
                  <div key={i} className="flex-1 h-full flex items-end group relative transition-all">
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap transition-opacity shadow-lg">
                      <p className="font-bold">{day.date}</p>
                      <p className="text-blue-300">{day.impressions} Views</p>
                      <p className="text-indigo-300">{day.clicks} Clicks</p>
                    </div>
                    {/* Impression Bar */}
                    <div 
                      className="w-full bg-blue-100 hover:bg-blue-200 rounded-t-sm transition-all" 
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Click Bar inside */}
                      <div 
                        className="w-full bg-indigo-500 rounded-t-sm absolute bottom-0 transition-all" 
                        style={{ height: `${clickHeightPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6 ml-10">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-100"></div><span className="text-xs font-bold text-gray-500">Impressions (GSC)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-indigo-500"></div><span className="text-xs font-bold text-gray-500">Clicks (GSC)</span></div>
          </div>
        </section>

        {/* Top Countries Table */}
        <section className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Top Geographic Segments</h2>
          <div className="flex-1">
            <div className="bg-gray-50 rounded-2xl overflow-hidden shadow-inner font-mono text-sm">
              <div className="grid grid-cols-3 p-3 border-b border-gray-200 font-bold text-xs text-gray-400 uppercase tracking-widest bg-gray-100/50">
                <span className="col-span-2">Country</span>
                <span className="text-right">Active</span>
              </div>
              {ga4Data && ga4Data.topCountries.map((c, i) => (
                <div key={i} className="grid grid-cols-3 p-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors items-center">
                  <span className="col-span-2 font-bold text-gray-700 truncate pr-2">{c.country}</span>
                  <span className="text-right font-black text-indigo-600">{c.activeUsers.toLocaleString()}</span>
                </div>
              ))}
              {!ga4Data && <div className="p-4 text-center text-gray-400">No data available</div>}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
             <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-center">Data aggregated via GA4 Data API</p>
          </div>
        </section>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, trend, color, reverse = false }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  
  const isPositive = trend.startsWith('+');
  // Reverse logic: a drop in rank (avg position) is good (represented by negative relative to position), so handle semantics
  const goodTrend = reverse ? !isPositive : isPositive;

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</h3>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-black text-gray-900 tracking-tighter">{value}</span>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${goodTrend ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
