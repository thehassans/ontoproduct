import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header.jsx'; // Adjust path if using different Header

/**
 * 🎨 Next-Gen SEO Dashboard Layout
 * Provides Sidebar Navigation across AEO, GEO, Traffic, and Optimization
 */

const SEONavLinks = [
  { 
    id: 'aeo', 
    label: 'AEO (Answer Engine)', 
    path: '/seo/aeo', 
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    )
  },
  { 
    id: 'geo', 
    label: 'GEO (Generative Content)', 
    path: '/seo/geo', 
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )
  },
  { 
    id: 'traffic', 
    label: 'Traffic & Analytics', 
    path: '/seo/traffic', 
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )
  },
  { 
    id: 'optimization', 
    label: 'CWV Optimization', 
    path: '/seo/optimization', 
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    )
  }
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans flex flex-col">
      <Header />
      
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        
        {/* Mobile Toggle */}
        <div className="lg:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-2">
          <span className="font-bold text-gray-800 tracking-tight">SEO Command Center</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 flex-shrink-0 gap-3`}>
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-3 mb-4">Command Center</h2>
            
            <nav className="flex flex-col gap-1.5">
              {SEONavLinks.map((link) => (
                <NavLink
                  key={link.id}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 translate-x-1' 
                      : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600 hover:translate-x-1'
                    }
                  `}
                >
                  <span className={`${link.isActive ? 'text-white' : 'text-gray-400 hover:text-orange-500'} transition-colors`}>{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </nav>
            
            <hr className="my-6 border-gray-100" />
            
            <div className="bg-orange-50 p-4 rounded-2xl">
              <h3 className="text-xs font-bold text-orange-800 mb-1">Agentic AI Mode</h3>
              <p className="text-[11px] text-orange-600 leading-relaxed mb-3">Your site is currently utilizing active GEO and AEO rendering patterns.</p>
              <button onClick={() => navigate('/admin')} className="text-[11px] bg-white text-orange-600 px-3 py-1.5 rounded-lg border border-orange-100 font-bold hover:shadow-sm w-full transition-all">
                Return to Admin
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area (Outlet dynamically loads Aeo.jsx, Geo.jsx, etc.) */}
        <main className="flex-1 min-w-0 bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-50 to-amber-50 rounded-full blur-[100px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 w-full h-full">
            <Outlet /> {/* Child routes render here */}
          </div>
        </main>
      </div>

    </div>
  );
}
