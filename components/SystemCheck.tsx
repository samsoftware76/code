'use client';

import { useState, useEffect } from 'react';

interface SystemStats {
  monitors: number;
  cameras: number;
  isCapturingDetected: boolean;
}

export default function SystemCheck() {
  const [stats, setStats] = useState<SystemStats>({ monitors: 0, cameras: 0, isCapturingDetected: false });
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const performCheck = async () => {
    setLoading(true);
    try {
      // Monitor Detection
      // Basic check using screen object
      const monitorCount = window.screen.availWidth < window.screen.width * 0.9 ? 2 : 1; 
      // Note: This is a heuristic. A more robust way in some browsers is window.getScreenDetails() 
      // but it requires a permission.
      
      // Camera Detection
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput').length;

      setStats({
        monitors: monitorCount,
        cameras: cameras,
        isCapturingDetected: false // We can't easily detect if we are being captured from within the tab, 
                                   // but we can warn about getDisplayMedia usage.
      });
      setShowDetails(true);
    } catch (error) {
      console.error('System check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#10101c', border: '1px solid #1e1e30', borderRadius: 12, padding: '16px', marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#e0e0f8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width={16} height={16} fill="none" stroke="#4f8ef7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Stealth Guard - Pre-Exam Scan
        </h3>
        <button 
          onClick={performCheck}
          disabled={loading}
          style={{ background: '#4f8ef7', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Scanning...' : 'Scan System'}
        </button>
      </div>

      {!showDetails ? (
        <p style={{ fontSize: 12, color: '#555577', margin: 0 }}>
          Detect hardware that proctoring software (Turing, Honorlock, etc.) might flag.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: stats.monitors > 1 ? 'rgba(220,50,50,0.1)' : 'rgba(50,220,50,0.05)', borderRadius: 8, border: `1px solid ${stats.monitors > 1 ? 'rgba(220,50,50,0.2)' : 'rgba(50,220,50,0.1)'}` }}>
            <div style={{ fontSize: 12, color: stats.monitors > 1 ? '#ff9999' : '#99ffb2', fontWeight: 600 }}>
              {stats.monitors > 1 ? '⚠️ Multiple Monitors Detected' : '✅ Single Monitor Mode'}
            </div>
            <div style={{ fontSize: 10, color: '#555577' }}>Proctors flag &gt;1 screen</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: stats.cameras > 0 ? 'rgba(220,220,50,0.1)' : 'rgba(50,220,50,0.05)', borderRadius: 8, border: `1px solid ${stats.cameras > 0 ? 'rgba(220,220,50,0.2)' : 'rgba(50,220,50,0.1)'}` }}>
            <div style={{ fontSize: 12, color: stats.cameras > 0 ? '#ffff99' : '#99ffb2', fontWeight: 600 }}>
              {stats.cameras > 0 ? `📷 ${stats.cameras} Camera(s) Active` : '✅ No Camera Detected'}
            </div>
            <div style={{ fontSize: 10, color: '#555577' }}>Active webcams are monitored</div>
          </div>

          <div style={{ background: '#1a1a30', padding: '10px', borderRadius: 8, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', marginBottom: 4, textTransform: 'uppercase' }}>Safety Recommendation</div>
            <p style={{ fontSize: 11, color: '#8888aa', margin: 0, lineHeight: 1.5 }}>
              The safest way to solve is using a **second device (phone)**. 
              Physically unplug extra monitors and cover your webcam if not required. 
              Avoid use of "Capture Screenshot" button in proctored tabs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
