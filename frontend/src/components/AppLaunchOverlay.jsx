import React, { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

function shouldShowAndroidLaunchOverlay() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  } catch {
    return false
  }
}

export default function AppLaunchOverlay() {
  const [visible, setVisible] = useState(() => shouldShowAndroidLaunchOverlay())
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!visible) return undefined

    try {
      const alreadyPlayed = sessionStorage.getItem('__buysial_android_launch_overlay__')
      if (alreadyPlayed === '1') {
        setVisible(false)
        return undefined
      }
      sessionStorage.setItem('__buysial_android_launch_overlay__', '1')
    } catch {}

    const frameId = window.requestAnimationFrame(() => setEntered(true))
    const hideTimer = window.setTimeout(() => setVisible(false), 1650)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(hideTimer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <>
      <div className={`app-launch-overlay ${entered ? 'entered' : ''}`}>
        <div className="app-launch-orb orb-left" />
        <div className="app-launch-orb orb-right" />
        <div className="app-launch-content">
          <div className="app-launch-logo-shell">
            <div className="app-launch-logo-glow" />
            <img src={`${import.meta.env.BASE_URL}mobile-app-launch-logo.png`} alt="BuySial" className="app-launch-logo" />
          </div>
          <div className="app-launch-progress">
            <span />
          </div>
        </div>
      </div>

      <style>{`
        .app-launch-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at top, rgba(249,115,22,0.18), transparent 38%),
            linear-gradient(180deg, #ffffff 0%, #fff7ed 52%, #ffffff 100%);
          opacity: 1;
          transition: opacity 0.42s ease, transform 0.42s ease;
        }

        .app-launch-overlay.entered {
          animation: appLaunchOverlayExit 0.45s ease 1.18s forwards;
        }

        .app-launch-content {
          position: relative;
          display: grid;
          gap: 18px;
          justify-items: center;
          padding: 24px;
          width: min(96vw, 420px);
          text-align: center;
        }

        .app-launch-logo-shell {
          position: relative;
          width: clamp(150px, 40vw, 196px);
          height: clamp(150px, 40vw, 196px);
          display: grid;
          place-items: center;
          animation: appLaunchFloat 1.35s ease-in-out forwards;
        }

        .app-launch-logo-glow {
          position: absolute;
          inset: 10%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(249,115,22,0.28), rgba(249,115,22,0.02) 72%);
          filter: blur(16px);
          animation: appLaunchGlow 1.4s ease-in-out infinite alternate;
        }

        .app-launch-logo {
          position: relative;
          width: 76%;
          height: 76%;
          object-fit: contain;
          filter: drop-shadow(0 20px 34px rgba(249,115,22,0.20));
          transform: scale(0.92);
          animation: appLaunchScale 0.82s cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
        }

        .app-launch-progress {
          width: min(72vw, 180px);
          height: 5px;
          border-radius: 999px;
          background: rgba(148,163,184,0.16);
          overflow: hidden;
          margin-top: 2px;
        }

        .app-launch-progress span {
          display: block;
          width: 100%;
          height: 100%;
          transform-origin: left center;
          background: linear-gradient(90deg, #f97316 0%, #fb923c 55%, #fdba74 100%);
          animation: appLaunchProgress 1.25s cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
        }

        .app-launch-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          opacity: 0.34;
          pointer-events: none;
        }

        .orb-left {
          width: 180px;
          height: 180px;
          left: -40px;
          top: 12%;
          background: rgba(251,146,60,0.36);
          animation: appLaunchOrbLeft 4.6s ease-in-out infinite;
        }

        .orb-right {
          width: 220px;
          height: 220px;
          right: -60px;
          bottom: 10%;
          background: rgba(249,115,22,0.26);
          animation: appLaunchOrbRight 5.2s ease-in-out infinite;
        }

        @keyframes appLaunchScale {
          from { opacity: 0; transform: scale(0.72) rotate(-8deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes appLaunchRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes appLaunchFloat {
          0% { transform: translateY(16px); }
          100% { transform: translateY(0); }
        }

        @keyframes appLaunchGlow {
          from { transform: scale(0.92); opacity: 0.26; }
          to { transform: scale(1.08); opacity: 0.42; }
        }

        @keyframes appLaunchProgress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @keyframes appLaunchOverlayExit {
          to {
            opacity: 0;
            transform: scale(1.02);
            visibility: hidden;
          }
        }

        @keyframes appLaunchOrbLeft {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(20px, -14px, 0) scale(1.08); }
        }

        @keyframes appLaunchOrbRight {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-18px, 12px, 0) scale(1.1); }
        }

        @media (max-width: 480px) {
          .app-launch-content {
            width: min(96vw, 320px);
            padding: 18px;
          }
        }
      `}</style>
    </>
  )
}
