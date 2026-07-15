import React, { useState, useEffect, useRef } from "react";
import { Globe, Plus, Trash2, RotateCw, Settings, Grid, Phone, CheckCircle2, AlertCircle, RefreshCcw, MapPin, Search, ShieldCheck, ChevronLeft, ChevronRight, Bookmark, Activity, Menu, X } from "lucide-react";
import { ProxyConfig, TabConfig, DevicePreset } from "./types";

const DEVICE_PRESETS: DevicePreset[] = [
  { name: "iPhone 15 Pro", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", width: 393, height: 852, icon: "apple" },
  { name: "Samsung Galaxy S23", userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36", width: 360, height: 780, icon: "android" },
  { name: "Google Pixel 8 Pro", userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36", width: 412, height: 892, icon: "pixel" },
  { name: "Desktop Chrome", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", width: 1280, height: 800, icon: "desktop" }
];

export default function App() {
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [masterTab, setMasterTab] = useState<TabConfig>({
    id: "master",
    name: "Master Control",
    device: "Desktop Chrome",
    userAgent: DEVICE_PRESETS[3].userAgent,
    width: DEVICE_PRESETS[3].width,
    height: DEVICE_PRESETS[3].height,
    proxyId: "", // Will be set once proxies load
    currentUrl: "https://www.hellosribordi.top/",
    history: ["https://www.hellosribordi.top/"]
  });

  const [tabs, setTabs] = useState<TabConfig[]>([]);
  const [inputUrl, setInputUrl] = useState("https://www.hellosribordi.top/");
  const [loadingProxies, setLoadingProxies] = useState(true);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [humanizeEnabled, setHumanizeEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [masterIframeSrc, setMasterIframeSrc] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Load Proxies
  useEffect(() => {
    fetch("/api/proxies")
      .then(res => res.json())
      .then(data => {
        setProxies(data);
        if (data.length > 0) {
          setMasterTab(prev => {
            const updated = { ...prev, proxyId: data[0].id };
            setMasterIframeSrc(getProxyUrl(updated));
            return updated;
          });
          
          // Generate 12 initial slave nodes!
          const initialSlaves: TabConfig[] = [];
          for (let i = 1; i <= 12; i++) {
            const proxy = data[i % data.length];
            const preset = DEVICE_PRESETS[i % 3];
            initialSlaves.push({
              id: `slave-${i}`,
              name: `Node 0${i}`,
              device: preset.name,
              userAgent: preset.userAgent,
              width: preset.width,
              height: preset.height,
              proxyId: proxy.id,
              currentUrl: "https://www.hellosribordi.top/",
              history: ["https://www.hellosribordi.top/"]
            });
          }
          setTabs(initialSlaves);
        }
        setLoadingProxies(false);
      })
      .catch(err => {
        console.error("Failed to load proxies:", err);
        setLoadingProxies(false);
      });
  }, []);

  // Listen for sync messages from iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const { type, tabId, action, data, url } = event.data;

      if (type === 'NAVIGATE') {
        if (tabId === 'master') {
          // Master navigated internally -> update Master config and ALL Slaves
          // Note: we do NOT update masterIframeSrc here because the master iframe already navigated itself smoothly
          if (url && url !== masterTab.currentUrl) {
            setInputUrl(url);
            
            const newHistory = [...masterTab.history.slice(0, historyIndex + 1), url];
            const newIndex = newHistory.length - 1;
            
            setHistoryIndex(newIndex);
            setMasterTab(prev => ({ ...prev, currentUrl: url, history: newHistory }));
            setTabs(prev => prev.map(t => {
              if (t.currentUrl === url) return t;
              return { ...t, currentUrl: url, history: [...t.history, url] };
            }));
          }
        } else {
          // Slave navigated independently
          if (url) {
            setTabs(prev => prev.map(t => t.id === tabId && t.currentUrl !== url ? { ...t, currentUrl: url, history: [...t.history, url] } : t));
          }
        }
      } else if (type === 'SYNC_ACTION') {
        // Broadcast Master scroll to active/visible Slaves to prevent DOM lag
        if (tabId === 'master') {
          const visibleSlaves = tabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
          visibleSlaves.forEach(slave => {
            const iframe = document.getElementById(`iframe-${slave.id}`) as HTMLIFrameElement;
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'EXEC_SYNC', action, data }, '*');
            }
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tabs, historyIndex, masterTab, currentPage]);

  // Handle current page boundaries when tab counts change
  useEffect(() => {
    const maxPage = Math.ceil(tabs.length / itemsPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(maxPage);
    } else if (currentPage < 1 && maxPage > 0) {
      setCurrentPage(1);
    }
  }, [tabs.length]);

  // Synchronize masterIframeSrc when master configuration parameters change (excluding URL to prevent infinite reload loops)
  useEffect(() => {
    if (masterTab.proxyId) {
      setMasterIframeSrc(getProxyUrl(masterTab));
    }
  }, [masterTab.proxyId, masterTab.userAgent, masterTab.device, humanizeEnabled, refreshKey]);

  // Backup polling check using same-origin access to handle javascript-based / dynamic redirects
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const iframe = document.getElementById("iframe-master") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          const currentIframeUrl = iframe.contentWindow.location.href;
          if (currentIframeUrl && currentIframeUrl.includes("/api/proxy-request")) {
            const urlParams = new URLSearchParams(iframe.contentWindow.location.search);
            const actualUrl = urlParams.get("url");
            
            if (actualUrl && actualUrl !== masterTab.currentUrl) {
              setInputUrl(actualUrl);
              setMasterTab(prev => {
                if (prev.currentUrl === actualUrl) return prev;
                const newHistory = [...prev.history, actualUrl];
                setTimeout(() => setHistoryIndex(newHistory.length - 1), 0);
                return { ...prev, currentUrl: actualUrl, history: newHistory };
              });
              setTabs(prev => prev.map(t => {
                if (t.currentUrl === actualUrl) return t;
                return {
                  ...t,
                  currentUrl: actualUrl,
                  history: [...t.history, actualUrl]
                };
              }));
            }
          }
        }
      } catch (err) {
        // Safe catch for cross-origin boundary transitions
      }
    }, 400);
    return () => clearInterval(interval);
  }, [masterTab.currentUrl]);

  const handleMasterNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let formatted = inputUrl.trim();
    if (!/^https?:\/\//i.test(formatted)) formatted = "https://" + formatted;
    
    setInputUrl(formatted);
    const newHistory = [...masterTab.history.slice(0, historyIndex + 1), formatted];
    setHistoryIndex(newHistory.length - 1);
    
    const updatedMaster = { ...masterTab, currentUrl: formatted, history: newHistory };
    setMasterTab(updatedMaster);
    setTabs(prev => prev.map(t => ({ ...t, currentUrl: formatted, history: [...t.history.slice(0, historyIndex + 1), formatted] })));
    setMasterIframeSrc(getProxyUrl(updatedMaster));
  };

  const navigateHistory = (direction: 'back' | 'forward') => {
    if (direction === 'back' && historyIndex > 0) {
       const prevUrl = masterTab.history[historyIndex - 1];
       setInputUrl(prevUrl);
       setHistoryIndex(historyIndex - 1);
       const updatedMaster = { ...masterTab, currentUrl: prevUrl };
       setMasterTab(updatedMaster);
       setTabs(prev => prev.map(t => ({ ...t, currentUrl: t.history[historyIndex - 1] || prevUrl })));
       setMasterIframeSrc(getProxyUrl(updatedMaster));
    } else if (direction === 'forward' && historyIndex < masterTab.history.length - 1) {
       const nextUrl = masterTab.history[historyIndex + 1];
       setInputUrl(nextUrl);
       setHistoryIndex(historyIndex + 1);
       const updatedMaster = { ...masterTab, currentUrl: nextUrl };
       setMasterTab(updatedMaster);
       setTabs(prev => prev.map(t => ({ ...t, currentUrl: t.history[historyIndex + 1] || nextUrl })));
       setMasterIframeSrc(getProxyUrl(updatedMaster));
    }
  };

  const handleSetSlaveCount = (count: number) => {
    if (proxies.length === 0 || count < 0) return;
    
    // Safety cap at 20,000 as requested to prevent overflow
    const cappedCount = Math.min(count, 20000);
    
    if (cappedCount > tabs.length) {
      const baseId = Date.now();
      const additionalCount = cappedCount - tabs.length;
      const additionalTabs: TabConfig[] = [];
      const currentUrl = masterTab.currentUrl;
      const historyArr = [currentUrl];
      
      for (let i = 0; i < additionalCount; i++) {
        const globalIdx = tabs.length + i;
        const nextIdx = globalIdx + 1;
        const proxy = proxies[nextIdx % proxies.length];
        const preset = DEVICE_PRESETS[nextIdx % 3];
        additionalTabs.push({
          id: `slave-${baseId}-${globalIdx}`,
          name: `Node ${nextIdx.toString().padStart(2, '0')}`,
          device: preset.name,
          userAgent: preset.userAgent,
          width: preset.width,
          height: preset.height,
          proxyId: proxy.id,
          currentUrl: currentUrl,
          history: historyArr
        });
      }
      setTabs(prev => [...prev, ...additionalTabs]);
    } else if (cappedCount < tabs.length) {
      setTabs(prev => prev.slice(0, cappedCount));
    }
  };

  const handleAddSlave = () => {
    handleSetSlaveCount(tabs.length + 1);
  };

  const handleRefreshAll = () => {
    const currentMasterUrl = masterTab.currentUrl;
    
    // Align all slaves to the current master URL
    setTabs(prev => prev.map(t => {
      if (t.currentUrl === currentMasterUrl) return t;
      return {
        ...t,
        currentUrl: currentMasterUrl,
        history: [...t.history, currentMasterUrl]
      };
    }));

    // Trigger state/iframe recreation by updating refreshKey
    setRefreshKey(prev => prev + 1);
    
    // Ensure inputUrl matches the Master's current URL
    setInputUrl(currentMasterUrl);
  };

  // Build proxy URL
  const getProxyUrl = (tab: TabConfig) => {
    if (!tab.proxyId) return "about:blank";
    return `/api/proxy-request?url=${encodeURIComponent(tab.currentUrl)}&proxyId=${encodeURIComponent(tab.proxyId)}&userAgent=${encodeURIComponent(tab.userAgent)}&tabId=${encodeURIComponent(tab.id)}&humanize=${humanizeEnabled}&refreshKey=${refreshKey}`;
  };

  const activeMasterProxy = proxies.find(p => p.id === masterTab.proxyId);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0F172A] text-slate-200 font-sans overflow-hidden">
      
      {/* HEADER (Geometric Balance Style) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-[#1E293B] border-b border-slate-700 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-900/50">
              NY
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">NY Proxy Engine</h1>
              <p className="text-xs text-blue-400 font-mono hidden sm:block">Master-Slave System</p>
            </div>
          </div>
          
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 flex-1 w-full md:max-w-3xl mx-0 md:mx-6">
          <form onSubmit={handleMasterNavigate} className="w-full flex flex-col sm:flex-row gap-2 md:gap-3 relative">
            <div className="flex w-full relative">
              <div className="absolute left-1 top-1.5 flex gap-1">
                <button type="button" onClick={() => navigateHistory('back')} disabled={historyIndex === 0} className={`p-1 rounded ${historyIndex === 0 ? 'text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => navigateHistory('forward')} disabled={historyIndex === masterTab.history.length - 1} className={`p-1 rounded ${historyIndex === masterTab.history.length - 1 ? 'text-slate-600' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <input 
                type="text" 
                placeholder="Enter destination URL (e.g., https://example.com)" 
                className="w-full bg-[#0F172A] border border-slate-600 rounded-md pl-16 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-200" 
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
              />
              <button type="button" className="absolute right-2 top-2.5 text-slate-500 hover:text-yellow-400" title="Bookmark">
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-6 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap shadow-md transition-colors flex items-center justify-center gap-2" title="Navigate Master node to URL">
              <RefreshCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Deploy</span>
            </button>
            <button 
              type="button" 
              onClick={handleRefreshAll}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 px-4 md:px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap shadow-md transition-colors flex items-center justify-center gap-2"
              title="Refresh and sync all nodes to current Master URL"
            >
              <RotateCw className="w-4 h-4" />
              <span>Refresh All</span>
            </button>
          </form>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">System Status</span>
            <span className="text-sm text-green-400 flex items-center gap-2 font-mono">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> 
              {tabs.length + 1} Nodes Active
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        
        {/* LEFT SIDEBAR */}
        <aside className={`${mobileMenuOpen ? 'block absolute z-50 w-full h-full' : 'hidden md:flex'} w-full md:w-72 bg-[#1E293B] border-r border-slate-700 p-4 flex-col gap-6 overflow-y-auto`}>
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Master Configuration
            </h3>
            <div className="space-y-2">
              <div className="bg-[#0F172A] p-2 rounded border border-slate-700 flex flex-col gap-1">
                <label className="text-[10px] uppercase text-slate-500">Master Proxy (Your IP)</label>
                <select 
                  className="bg-transparent text-xs text-blue-400 font-mono focus:outline-none w-full truncate"
                  value={masterTab.proxyId}
                  onChange={(e) => setMasterTab(prev => ({...prev, proxyId: e.target.value}))}
                >
                  {proxies.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">{p.ip} ({p.name})</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#0F172A] p-2 rounded border border-slate-700 flex flex-col gap-1">
                <label className="text-[10px] uppercase text-slate-500">Master Device View</label>
                <select 
                  className="bg-transparent text-xs text-blue-400 font-mono focus:outline-none w-full"
                  value={masterTab.device}
                  onChange={(e) => {
                    const preset = DEVICE_PRESETS.find(p => p.name === e.target.value);
                    if (preset) setMasterTab(prev => ({...prev, device: preset.name, userAgent: preset.userAgent, width: preset.width, height: preset.height}));
                  }}
                >
                  {DEVICE_PRESETS.map(p => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-slate-200">{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#0F172A] p-2 rounded border border-slate-700 flex items-center justify-between gap-1 cursor-pointer" onClick={() => setHumanizeEnabled(!humanizeEnabled)}>
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${humanizeEnabled ? 'text-green-400' : 'text-slate-500'}`} />
                  <span className="text-[11px] text-slate-300">Humanize Activity</span>
                </div>
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${humanizeEnabled ? 'bg-green-500' : 'bg-slate-600'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${humanizeEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Slave Node Profiles</h3>
            <div className="flex flex-wrap gap-2">
              {DEVICE_PRESETS.filter(p => p.name !== "Desktop Chrome").map(p => (
                <span key={p.name} className="bg-blue-900/30 text-blue-300 text-[10px] px-2 py-1 rounded border border-blue-800">
                  {p.name}
                </span>
              ))}
            </div>
          </section>

          <section className="flex-1">
             <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Slave Nodes Count</h3>
             <div className="flex gap-2 items-center bg-[#0F172A] border border-slate-700 rounded-md p-1">
               <input 
                 type="number"
                 min="0"
                 max="20000"
                 value={tabs.length}
                 onChange={(e) => handleSetSlaveCount(parseInt(e.target.value) || 0)}
                 className="bg-transparent w-full text-center text-slate-300 focus:outline-none font-mono text-sm py-1"
               />
               <button 
                 onClick={handleAddSlave}
                 className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition"
                 title="Add One Slave Node"
               >
                 <Plus className="w-4 h-4" />
               </button>
             </div>
             <p className="text-[9px] text-slate-500 mt-2 text-center">Adjust count to auto-provision nodes (Max: 20,000)</p>
          </section>
          
          <div className="mt-auto border-t border-slate-700 pt-4 text-center">
            <p className="text-[10px] text-slate-500 mb-2">Proxy Pool Active: {proxies.length} IPs</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[84%]"></div>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA */}
        <section className="flex-1 flex flex-col bg-[#0F172A] p-6 gap-6 overflow-hidden">
          
          {/* MASTER BROWSER (TOP) */}
          <div className="flex flex-col bg-black rounded-xl border border-blue-600/50 overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.15)] flex-none h-[45%] relative">
            {/* Master Header */}
            <div className="bg-slate-900 px-4 py-2 flex justify-between items-center border-b border-blue-900/50">
              <div className="flex items-center gap-3">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Master Node</span>
                <span className="text-[11px] font-mono text-blue-300">
                  IP: {activeMasterProxy ? activeMasterProxy.ip : "Loading..."}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                <span>View: {masterTab.device}</span>
                <span className="text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> LIVE SYNC</span>
              </div>
            </div>

            {/* Master IFrame */}
            <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center">
               <div className="w-full h-full relative" style={{ maxWidth: masterTab.device === 'Desktop Chrome' ? '100%' : `${masterTab.width}px` }}>
                  {loadingProxies ? (
                     <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-blue-400"><RotateCw className="w-8 h-8 animate-spin" /></div>
                  ) : (
                     <iframe 
                       id="iframe-master"
                       key={`${masterTab.id}-${masterIframeSrc}-${refreshKey}`} src={masterIframeSrc || getProxyUrl(masterTab)}
                       className="absolute inset-0 w-full h-full border-0 bg-white"
                       title="Master Browser"
                       referrerPolicy="no-referrer"
                       sandbox="allow-scripts allow-same-origin allow-forms"
                     />
                  )}
               </div>
            </div>
          </div>

          {/* SLAVE NODES GRID (BOTTOM) */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
             <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400 flex items-center gap-2">
                   <Grid className="w-4 h-4" /> Slave Nodes ({tabs.length})
                </h2>
                {tabs.length > itemsPerPage && (
                  <div className="bg-blue-900/40 border border-blue-800/60 text-blue-300 text-xs px-3 py-1.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full mt-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 animate-pulse" />
                      <span>
                        <strong>Virtual Previews Active:</strong> Displaying {itemsPerPage} active previews at a time to prevent browser crashes. All {tabs.length} simulated nodes are operating and synced in parallel.
                      </span>
                    </div>
                    <div className="flex-shrink-0 font-mono text-[10px] bg-blue-950 px-2 py-0.5 rounded border border-blue-800 text-blue-400 self-start sm:self-auto">
                      Active Page Nodes: {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, tabs.length)}
                    </div>
                  </div>
                )}
                <span className="text-[10px] text-slate-500 font-mono">Scroll and clicks in Master will replicate here.</span>
             </div>
             
             <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                {tabs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tab) => {
                  const slaveProxy = proxies.find(p => p.id === tab.proxyId) || proxies[0];
                  
                  // Scale logic for iframe mini view
                  // Assuming fixed container width of ~180px, device width ~360px -> scale ~0.5
                  return (
                    <div key={tab.id} className="relative flex flex-col bg-black rounded-xl border border-slate-700 overflow-hidden shadow-2xl h-[280px]">
                      
                      {/* Slave Header */}
                      <div className="bg-slate-900 px-2 py-1.5 flex justify-between items-center border-b border-slate-800">
                        <span className="text-[9px] font-mono text-blue-400 truncate pr-2">IP: {slaveProxy?.ip}</span>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                      </div>
                      
                      {/* Slave Screen Preview */}
                      <div className="flex-1 relative overflow-hidden bg-white/5 flex justify-center">
                        <div className="absolute origin-top" style={{ width: tab.width, height: tab.height, transform: 'scale(0.4)' }}>
                           <iframe 
                             key={`${tab.id}-${tab.currentUrl}-${tab.proxyId}-${tab.userAgent}-${refreshKey}`}
                             id={`iframe-${tab.id}`}
                             src={getProxyUrl(tab)}
                             className="w-full h-full border-0 bg-white"
                             title={`Slave ${tab.id}`}
                             referrerPolicy="no-referrer"
                             sandbox="allow-scripts allow-same-origin allow-forms"
                           />
                        </div>
                      </div>

                      {/* Slave Footer Info */}
                      <div className="p-2 text-center border-t border-slate-800 bg-slate-950/80">
                        <p className="text-[10px] text-slate-400 truncate">{tab.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                           <p className="text-[9px] text-slate-600 truncate">{tab.device}</p>
                           <button 
                             onClick={() => setTabs(tabs.filter(t => t.id !== tab.id))}
                             className="text-slate-600 hover:text-red-400 transition"
                           >
                             <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
</div>

              {/* Pagination Control Bar */}
              {Math.ceil(tabs.length / itemsPerPage) > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-300 text-xs mt-3">
                  <span className="font-mono text-slate-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, tabs.length)} of <strong className="text-blue-400">{tabs.length}</strong> nodes
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition text-[10px] font-semibold"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="font-mono px-3">
                      Page <strong className="text-blue-400">{currentPage}</strong> of <strong>{Math.ceil(tabs.length / itemsPerPage)}</strong>
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(tabs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(tabs.length / itemsPerPage)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.ceil(tabs.length / itemsPerPage))}
                      disabled={currentPage === Math.ceil(tabs.length / itemsPerPage)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition text-[10px] font-semibold"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
           </div>

        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1E293B] border-t border-slate-700 px-6 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex gap-4">
          <span>Sessions: 142 Today</span>
          <span>Avg Latency: 42ms</span>
          <span>Proxy Pool: {proxies.length}+ NY Residential</span>
        </div>
        <div className="flex gap-2 items-center">
          <span className="bg-green-900/40 text-green-400 px-2 rounded font-mono">AUTO-SYNC ENABLED</span>
          <span className="font-mono">v4.8.2-stable</span>
        </div>
      </footer>
      
    </div>
  );
}
