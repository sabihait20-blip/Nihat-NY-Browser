import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios, { AxiosRequestConfig } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import dotenv from "dotenv";

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(express.json());

// List of high-quality European Proxy servers and simulation IPs
let nyProxies = [
  {
    id: "eu-res-1",
    name: "London Residential (BT Fibre)",
    ip: "82.132.34.112",
    port: 8080,
    type: "HTTP" as const,
    location: "London, UK",
    isp: "BT Broadband",
    status: "active" as const,
    latency: 18,
    username: "",
    password: ""
  },
  {
    id: "eu-res-2",
    name: "Frankfurt High-Speed (Deutsche Telekom)",
    ip: "80.187.91.43",
    port: 3128,
    type: "HTTP" as const,
    location: "Frankfurt, Germany",
    isp: "Deutsche Telekom",
    status: "active" as const,
    latency: 22,
    username: "",
    password: ""
  },
  {
    id: "eu-res-3",
    name: "Paris Business Hub (Orange)",
    ip: "90.84.12.215",
    port: 8888,
    type: "HTTPS" as const,
    location: "Paris, France",
    isp: "Orange France",
    status: "active" as const,
    latency: 25,
    username: "",
    password: ""
  },
  {
    id: "eu-res-4",
    name: "Amsterdam Residential Gateway (Ziggo)",
    ip: "145.97.23.189",
    port: 1080,
    type: "SOCKS5" as const,
    location: "Amsterdam, Netherlands",
    isp: "Ziggo",
    status: "active" as const,
    latency: 15,
    username: "",
    password: ""
  },
  {
    id: "eu-res-5",
    name: "Madrid Fiber Proxy (Telefónica)",
    ip: "2.136.42.107",
    port: 8000,
    type: "HTTP" as const,
    location: "Madrid, Spain",
    isp: "Telefónica de España",
    status: "active" as const,
    latency: 35,
    username: "",
    password: ""
  }
];

// Generate 250 additional mock European proxies including mobile carriers with European mobile IPs
const carriersList = [
  { country: "UK", location: "London", isp: "EE Mobile 5G", ipPrefix: "82.132" },
  { country: "UK", location: "Manchester", isp: "Vodafone UK LTE", ipPrefix: "94.197" },
  { country: "UK", location: "Birmingham", isp: "O2 UK 4G", ipPrefix: "109.155" },
  { country: "Germany", location: "Berlin", isp: "Telekom.de 5G", ipPrefix: "80.187" },
  { country: "Germany", location: "Munich", isp: "Vodafone.de LTE", ipPrefix: "109.40" },
  { country: "Germany", location: "Frankfurt", isp: "O2 de 5G", ipPrefix: "31.18" },
  { country: "France", location: "Paris", isp: "Orange France 5G", ipPrefix: "90.84" },
  { country: "France", location: "Lyon", isp: "SFR Mobile LTE", ipPrefix: "176.128" },
  { country: "France", location: "Marseille", isp: "Bouygues 4G", ipPrefix: "37.14" },
  { country: "Netherlands", location: "Amsterdam", isp: "KPN Mobile 5G", ipPrefix: "31.20" },
  { country: "Netherlands", location: "Rotterdam", isp: "Vodafone NL LTE", ipPrefix: "145.95" },
  { country: "Spain", location: "Madrid", isp: "Movistar 5G", ipPrefix: "2.138" },
  { country: "Spain", location: "Barcelona", isp: "Orange España 4G", ipPrefix: "90.160" },
  { country: "Italy", location: "Rome", isp: "TIM 5G", ipPrefix: "5.90" },
  { country: "Italy", location: "Milan", isp: "Vodafone Italia LTE", ipPrefix: "109.112" },
  { country: "Sweden", location: "Stockholm", isp: "Telia 5G", ipPrefix: "81.224" },
  { country: "Switzerland", location: "Zurich", isp: "Swisscom 5G LTE", ipPrefix: "85.4" },
  { country: "Poland", location: "Warsaw", isp: "Orange Polska LTE", ipPrefix: "94.254" },
  { country: "Belgium", location: "Brussels", isp: "Proximus 5G", ipPrefix: "109.130" },
  { country: "Ireland", location: "Dublin", isp: "Three Ireland LTE", ipPrefix: "109.76" }
];

const generalIsps = [
  "BT Broadband (UK)", 
  "Virgin Media (UK)", 
  "Deutsche Telekom (Germany)", 
  "Vodafone (Germany)", 
  "Orange (France)", 
  "Free Telecom (France)", 
  "KPN (Netherlands)", 
  "Ziggo (Netherlands)", 
  "Telefónica (Spain)", 
  "TIM (Italy)",
  "Telia (Sweden)",
  "Swisscom (Switzerland)",
  "Belgacom (Belgium)",
  "Eir (Ireland)"
];

const generalLocations = [
  "London, UK",
  "Manchester, UK",
  "Birmingham, UK",
  "Berlin, Germany",
  "Munich, Germany",
  "Frankfurt, Germany",
  "Paris, France",
  "Lyon, France",
  "Amsterdam, Netherlands",
  "Rotterdam, Netherlands",
  "Madrid, Spain",
  "Barcelona, Spain",
  "Rome, Italy",
  "Milan, Italy",
  "Stockholm, Sweden",
  "Zurich, Switzerland",
  "Brussels, Belgium",
  "Dublin, Ireland"
];

const types: ("HTTP" | "HTTPS" | "SOCKS5")[] = ["HTTP", "HTTPS", "SOCKS5"];

for (let i = 6; i <= 255; i++) {
  const isMobile = i % 2 === 0;
  let ip = "";
  let location = "";
  let isp = "";
  let name = "";

  if (isMobile) {
    const carrier = carriersList[i % carriersList.length];
    ip = `${carrier.ipPrefix}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
    location = `${carrier.location}, ${carrier.country}`;
    isp = carrier.isp;
    name = `Mobile Node ${i} (${carrier.country})`;
  } else {
    // European residential IP prefix simulation
    const prefixes = ["82", "80", "90", "145", "2", "31", "109", "94", "37", "176", "185", "195"];
    const chosenPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    ip = `${chosenPrefix}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    location = generalLocations[Math.floor(Math.random() * generalLocations.length)];
    isp = generalIsps[Math.floor(Math.random() * generalIsps.length)];
    name = `EU Node ${i} (${location})`;
  }

  nyProxies.push({
    id: `eu-res-${i}`,
    name: name,
    ip: ip,
    port: [8080, 3128, 8888, 1080, 8000][Math.floor(Math.random() * 5)],
    type: types[Math.floor(Math.random() * types.length)],
    location: location,
    isp: isp,
    status: "active",
    latency: Math.floor(Math.random() * 40) + 10,
    username: "",
    password: ""
  });
}

// Deterministic Anti-Detect browser fingerprinting profile generator for proxy nodes
function getDeterministicFingerprint(tabId: string, proxyLocation: string, userAgent: string) {
  let hash = 0;
  const str = tabId || "default-node";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);

  let timezone = "Europe/London";
  let locale = "en-GB";
  const locLower = proxyLocation ? proxyLocation.toLowerCase() : "";
  
  if (locLower.includes("uk") || locLower.includes("london") || locLower.includes("united kingdom") || locLower.includes("england") || locLower.includes("great britain")) {
    timezone = "Europe/London";
    locale = "en-GB";
  } else if (locLower.includes("germany") || locLower.includes("berlin") || locLower.includes("frankfurt") || locLower.includes("munich")) {
    timezone = "Europe/Berlin";
    locale = "de-DE";
  } else if (locLower.includes("france") || locLower.includes("paris") || locLower.includes("lyon") || locLower.includes("marseille")) {
    timezone = "Europe/Paris";
    locale = "fr-FR";
  } else if (locLower.includes("netherlands") || locLower.includes("amsterdam") || locLower.includes("rotterdam")) {
    timezone = "Europe/Amsterdam";
    locale = "nl-NL";
  } else if (locLower.includes("spain") || locLower.includes("madrid") || locLower.includes("barcelona")) {
    timezone = "Europe/Madrid";
    locale = "es-ES";
  } else if (locLower.includes("italy") || locLower.includes("rome") || locLower.includes("milan")) {
    timezone = "Europe/Rome";
    locale = "it-IT";
  } else if (locLower.includes("sweden") || locLower.includes("stockholm")) {
    timezone = "Europe/Stockholm";
    locale = "sv-SE";
  } else if (locLower.includes("switzerland") || locLower.includes("zurich")) {
    timezone = "Europe/Zurich";
    locale = "de-CH";
  } else if (locLower.includes("poland") || locLower.includes("warsaw")) {
    timezone = "Europe/Warsaw";
    locale = "pl-PL";
  } else if (locLower.includes("belgium") || locLower.includes("brussels")) {
    timezone = "Europe/Brussels";
    locale = "fr-BE";
  } else if (locLower.includes("ireland") || locLower.includes("dublin")) {
    timezone = "Europe/Dublin";
    locale = "en-IE";
  }

  const isApple = userAgent && (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("Macintosh") || userAgent.includes("Apple"));
  const isAndroid = userAgent && userAgent.includes("Android");
  
  let webglVendor = "Google Inc. (NVIDIA)";
  let webglRenderer = "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)";
  
  const desktopGpus = [
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)" }
  ];

  const appleGpus = [
    { vendor: "Apple Inc.", renderer: "Apple GPU" },
    { vendor: "Apple Inc.", renderer: "Apple M1" },
    { vendor: "Apple Inc.", renderer: "Apple M2" }
  ];

  const androidGpus = [
    { vendor: "ARM", renderer: "Mali-G715 MC10" },
    { vendor: "Qualcomm", renderer: "Adreno (TM) 740" },
    { vendor: "Samsung", renderer: "Xclipse 940" }
  ];

  if (isApple) {
    const gpuIdx = seed % appleGpus.length;
    webglVendor = appleGpus[gpuIdx].vendor;
    webglRenderer = appleGpus[gpuIdx].renderer;
  } else if (isAndroid) {
    const gpuIdx = seed % androidGpus.length;
    webglVendor = androidGpus[gpuIdx].vendor;
    webglRenderer = androidGpus[gpuIdx].renderer;
  } else {
    const gpuIdx = seed % desktopGpus.length;
    webglVendor = desktopGpus[gpuIdx].vendor;
    webglRenderer = desktopGpus[gpuIdx].renderer;
  }

  const rSalt = ((seed % 5) - 2) || 1;
  const gSalt = (((seed >> 2) % 5) - 2) || -1;
  const bSalt = (((seed >> 4) % 5) - 2) || 2;
  const aSalt = (((seed >> 6) % 3) - 1) || 0;

  const hardwareConcurrency = [4, 6, 8, 12, 16][seed % 5];
  const deviceMemory = [4, 8, 12, 16][seed % 4];
  const colorDepth = [24, 32][seed % 2];
  
  return {
    timezone,
    locale,
    webglVendor,
    webglRenderer,
    rSalt,
    gSalt,
    bSalt,
    aSalt,
    hardwareConcurrency,
    deviceMemory,
    colorDepth,
    canvasHash: `cf_hash_${(seed * 739).toString(16).slice(0, 8).toUpperCase()}`
  };
}

app.get("/api/node-fingerprint", (req, res) => {
  const tabId = req.query.tabId as string;
  const proxyId = req.query.proxyId as string;
  const userAgent = req.query.userAgent as string;

  const selectedProxy = nyProxies.find(p => p.id === proxyId) || nyProxies[0];
  const fingerprint = getDeterministicFingerprint(tabId, selectedProxy ? selectedProxy.location : "", userAgent || "");

  res.json({
    tabId,
    proxyIp: selectedProxy ? selectedProxy.ip : "Direct",
    proxyLocation: selectedProxy ? selectedProxy.location : "USA",
    ...fingerprint
  });
});

// Endpoint to list standard New York Proxies
let activeProxyRequests = 0;
let totalProxyRequests = 0;

app.get("/api/health-stats", (req, res) => {
  // Generate fluctuating but realistic CPU and memory based on actual loaded nodes and active queries
  const baseCpu = 12.4 + (activeProxyRequests * 9.5);
  const cpuUsage = Math.min(99.2, parseFloat((baseCpu + Math.random() * 5.1).toFixed(1)));

  const baseMem = 142.5 + (activeProxyRequests * 16.8);
  const memoryUsage = Math.min(512.0, parseFloat((baseMem + Math.random() * 7.4).toFixed(1)));

  res.json({
    cpuUsage,
    memoryUsage,
    activeConnections: activeProxyRequests,
    totalRequests: totalProxyRequests,
    totalProxies: nyProxies.length,
    uptime: Math.floor(process.uptime()),
    status: cpuUsage > 85 ? "warning" : "healthy"
  });
});

app.get("/api/proxies", (req, res) => {
  res.json(nyProxies);
});

// Endpoint to add a custom Proxy to the testing suite
app.post("/api/proxies", (req, res) => {
  const { name, ip, port, type, location, isp, username, password } = req.body;
  if (!ip || !port) {
    return res.status(400).json({ error: "IP and Port are required." });
  }
  const newProxy = {
    id: `custom-${Date.now()}`,
    name: name || `Custom NY Proxy (${ip})`,
    ip,
    port: parseInt(port),
    type: (type || "HTTP") as "HTTP" | "HTTPS" | "SOCKS5",
    location: location || "New York State, NY",
    isp: isp || "Residential Carrier",
    status: "active" as const,
    latency: Math.floor(Math.random() * 80) + 20,
    username: username || "",
    password: password || ""
  };
  nyProxies.push(newProxy);
  res.status(201).json(newProxy);
});

// Endpoint to delete a custom proxy
app.delete("/api/proxies/:id", (req, res) => {
  const { id } = req.params;
  nyProxies = nyProxies.filter(p => p.id !== id);
  res.json({ success: true, message: "Proxy deleted successfully." });
});

// Endpoint to test a proxy server
app.post("/api/test-proxy", async (req, res) => {
  const { ip, port, type, username, password } = req.body;
  
  // Real check with ipinfo or dummy fallback in sandboxed envs
  try {
    const isMock = ip.startsWith("198.51.") || ip.startsWith("172.56.") || ip.startsWith("206.189.") || ip.startsWith("67.244.") || ip.startsWith("69.203.") || ip.startsWith("104.");
    if (isMock) {
      // Return beautiful mock testing latency
      return res.json({
        success: true,
        latency: Math.floor(Math.random() * 50) + 15,
        location: "New York, USA",
        isp: "Verizon Residential"
      });
    }

    const authString = username && password ? `${username}:${password}@` : "";
    const proxyUrl = `${type.toLowerCase()}://${authString}${ip}:${port}`;
    const agent = new HttpsProxyAgent(proxyUrl);
    
    const start = Date.now();
    const response = await axios.get("https://ipinfo.io/json", {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 5000
    });
    const latency = Date.now() - start;

    res.json({
      success: true,
      latency,
      location: `${response.data.city || "New York"}, ${response.data.region || "NY"}`,
      isp: response.data.org || "Residential ISP"
    });
  } catch (err: any) {
    res.json({
      success: false,
      error: err.message || "Failed to connect to proxy"
    });
  }
});

// Dynamic web-scraping/proxy relay request to bypass Iframe restrictions
app.get("/api/proxy-request", async (req, res) => {
  activeProxyRequests++;
  totalProxyRequests++;
  const targetUrlStr = req.query.url as string;
  const proxyId = req.query.proxyId as string;
  const userAgent = req.query.userAgent as string;
  const humanize = req.query.humanize === 'true';
  const referer = req.query.referer as string;
  const customHeaderName = req.query.customHeaderName as string;
  const customHeaderValue = req.query.customHeaderValue as string;
  const antiFingerprint = req.query.antiFingerprint !== 'false';
  const tabId = req.query.tabId as string;

  if (!targetUrlStr) {
    return res.status(400).send("Target URL is required.");
  }

  // Ensure protocol is specified
  let formattedUrl = targetUrlStr;
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = "https://" + formattedUrl;
  }

  const selectedProxy = nyProxies.find(p => p.id === proxyId) || nyProxies[0];
  const fp = getDeterministicFingerprint(tabId, selectedProxy ? selectedProxy.location : "", userAgent || "");

  try {
    const config: AxiosRequestConfig = {
      headers: {
        "User-Agent": userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": userAgent.includes("Mobile") ? "?1" : "?0",
        "Sec-Ch-Ua-Platform": userAgent.includes("Windows") ? '"Windows"' : userAgent.includes("Mac") ? '"macOS"' : userAgent.includes("Android") ? '"Android"' : '"iOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      responseType: "text",
      timeout: 8000,
      validateStatus: () => true
    };

    if (referer) {
      config.headers["Referer"] = referer;
    }
    if (customHeaderName && customHeaderValue) {
      config.headers[customHeaderName] = customHeaderValue;
    }

    // If it is a real custom proxy (not pre-configured dummy proxies), apply proxy agent
    const isRealProxy = selectedProxy && !selectedProxy.id.startsWith("ny-res-") && !selectedProxy.id.startsWith("eu-res-");
    if (isRealProxy && selectedProxy.ip) {
      const auth = selectedProxy.username && selectedProxy.password 
        ? `${selectedProxy.username}:${selectedProxy.password}@` 
        : "";
      const proxyUrlStr = `${selectedProxy.type.toLowerCase()}://${auth}${selectedProxy.ip}:${selectedProxy.port}`;
      const agent = new HttpsProxyAgent(proxyUrlStr);
      config.httpAgent = agent;
      config.httpsAgent = agent;
    } else {
      // Simulate EU Proxy by injecting European Forwarded Headers
      config.headers = {
        ...config.headers,
        "X-Forwarded-For": selectedProxy.ip,
        "X-Real-IP": selectedProxy.ip,
        "X-Client-IP": selectedProxy.ip,
        "CF-Connecting-IP": selectedProxy.ip,
        "X-Forwarded-Proto": "https",
        "Accept-Encoding": "identity" // Prevent gzip to easily rewrite contents
      };
    }

    const response = await axios.get(formattedUrl, config);
    let htmlContent = response.data;

    if (typeof htmlContent !== "string") {
      return res.status(400).send("Target page returned binary or unsupported non-text format.");
    }

    // Capture the final URL after following any redirects
    const finalUrl = (response.request?.res?.responseUrl as string) || (response.request?.responseURL as string) || formattedUrl;

    // Rewrite relative links, stylesheets, scripts, and images to keep everything routed through our backend proxy!
    const parsedUrl = new URL(finalUrl);
    const origin = parsedUrl.origin;

    // Inject base href tag or rewrite links dynamically
    // Let's rewrite links so we don't break stylesheet/asset rendering
    // Injecting a base tag at the beginning of the head tag is the cleanest and most robust way
    const baseTag = `<base href="${origin}/" />`;
    
    const fingerprintScript = antiFingerprint ? `
        // Anti-Detect Browser Fingerprinting Suite
        try {
          // 1. Spoof Timezone and Locale
          const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
          Intl.DateTimeFormat.prototype.resolvedOptions = function() {
            const options = originalResolvedOptions.call(this);
            options.timeZone = "${fp.timezone}";
            options.locale = "${fp.locale}";
            return options;
          };
          
          // Helper to calculate timezone offset on the fly
          const getTzOffset = (tz) => {
            const date = new Date();
            const format = new Intl.DateTimeFormat('en-US', {
              timeZone: tz,
              year: 'numeric', month: 'numeric', day: 'numeric',
              hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
            });
            const parts = format.formatToParts(date);
            const partVal = (type) => parseInt(parts.find(p => p.type === type).value, 10);
            const year = partVal('year');
            const month = partVal('month') - 1;
            const day = partVal('day');
            const hour = partVal('hour');
            const minute = partVal('minute');
            const second = partVal('second');
            const targetUtc = Date.UTC(year, month, day, hour, minute, second);
            const clientUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
            return Math.round((clientUtc - targetUtc) / 60000);
          };
          
          const targetOffset = getTzOffset("${fp.timezone}");
          Date.prototype.getTimezoneOffset = function() {
            return targetOffset;
          };

          // Override Date.prototype.toString etc to display the spoofed timezone name
          const originalToString = Date.prototype.toString;
          Date.prototype.toString = function() {
            return originalToString.call(this).replace(/\\(([^\\)]+)\\)$/, '(${fp.timezone.split("/").pop().replace("_", " ")})');
          };

          // 2. Spoof WebGL GPU Vendor & Renderer
          const spoofWebGL = (glProto) => {
            if (!glProto) return;
            const originalGetParameter = glProto.getParameter;
            glProto.getParameter = function(pname) {
              if (pname === 0x9245) return "${fp.webglVendor}"; // UNMASKED_VENDOR_WEBGL
              if (pname === 0x9246) return "${fp.webglRenderer}"; // UNMASKED_RENDERER_WEBGL
              if (pname === 35713) return "WebGL 2.0 (OpenGL ES 3.0 Chromium)"; // gl.VERSION
              if (pname === 7936) return "${fp.webglVendor}"; // gl.VENDOR
              if (pname === 7937) return "${fp.webglRenderer}"; // gl.RENDERER
              return originalGetParameter.call(this, pname);
            };
          };
          spoofWebGL(WebGLRenderingContext.prototype);
          spoofWebGL(WebGL2RenderingContext.prototype);

          // 3. Spoof Canvas Pixel Output to break hashing fingerprinters
          const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
          CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
            const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
            const data = imageData.data;
            const rSalt = ${fp.rSalt};
            const gSalt = ${fp.gSalt};
            const bSalt = ${fp.bSalt};
            const aSalt = ${fp.aSalt};
            for (let i = 0; i < data.length; i += 4) {
              if (data[i+3] > 0) { // Only noise non-transparent pixels
                data[i] = Math.max(0, Math.min(255, data[i] + (i % 2 === 0 ? rSalt : -rSalt)));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + (i % 3 === 0 ? gSalt : -gSalt)));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + (i % 5 === 0 ? bSalt : -bSalt)));
                if (aSalt !== 0) {
                  data[i+3] = Math.max(0, Math.min(255, data[i+3] + aSalt));
                }
              }
            }
            return imageData;
          };

          const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
          HTMLCanvasElement.prototype.toDataURL = function(type, encoderOptions) {
            const ctx = this.getContext('2d');
            if (ctx) {
              try {
                const w = this.width;
                const h = this.height;
                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;
                const rSalt = ${fp.rSalt};
                const gSalt = ${fp.gSalt};
                const bSalt = ${fp.bSalt};
                for (let i = 0; i < data.length; i += 4) {
                  if (data[i+3] > 0) {
                    data[i] = Math.max(0, Math.min(255, data[i] + rSalt));
                    data[i+1] = Math.max(0, Math.min(255, data[i+1] + gSalt));
                    data[i+2] = Math.max(0, Math.min(255, data[i+2] + bSalt));
                  }
                }
                ctx.putImageData(imgData, 0, 0);
              } catch (e) {}
            }
            return originalToDataURL.call(this, type, encoderOptions);
          };

          // 4. Hardware and Memory constraints
          Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${fp.hardwareConcurrency} });
          Object.defineProperty(navigator, 'deviceMemory', { get: () => ${fp.deviceMemory} });

          // 5. Spoof Screen Dimensions
          Object.defineProperty(screen, 'width', { get: () => ${fp.colorDepth === 32 ? 1920 : 1440} });
          Object.defineProperty(screen, 'height', { get: () => ${fp.colorDepth === 32 ? 1080 : 900} });
          Object.defineProperty(screen, 'availWidth', { get: () => ${fp.colorDepth === 32 ? 1920 : 1440} });
          Object.defineProperty(screen, 'availHeight', { get: () => ${fp.colorDepth === 32 ? 1040 : 860} });
          Object.defineProperty(screen, 'colorDepth', { get: () => ${fp.colorDepth} });
          Object.defineProperty(screen, 'pixelDepth', { get: () => ${fp.colorDepth} });

          console.log("[Anti-Detect] Deterministic fingerprint successfully injected for tab: " + tabId);
        } catch (err) {
          console.error("[Anti-Detect] Injection failed:", err);
        }
    ` : "";

    const scriptRewriteInterceptors = `
      <script>
        ${fingerprintScript}

        // Anti-Bot / Humanization Spoofing
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          window.chrome = { runtime: {} };
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ? 
              Promise.resolve({ state: Notification.permission } ) : 
              originalQuery(parameters)
          );
        } catch(e) {}

        ${humanize ? `
        // Humanize Activity (Random Scrolling & Mouse Movement Jitter)
        setInterval(() => {
          if (Math.random() > 0.7) {
            window.scrollBy({
              top: (Math.random() - 0.5) * 50,
              behavior: 'smooth'
            });
          }
        }, Math.floor(Math.random() * 3000) + 2000);
        ` : ''}

        var _realParent = window.parent || window;
        // Prevent top-frame redirects (framebusting)
        window.onbeforeunload = function() {};
        if (window.self !== window.top) {
          try {
            Object.defineProperty(window, 'parent', { get: function() { return null; } });
            Object.defineProperty(window, 'top', { get: function() { return window.self; } });
          } catch(e) {}
        }

        var tabId = new URLSearchParams(window.location.search).get('tabId') || '';
        var currentRealUrl = decodeURI("${encodeURI(finalUrl)}");

        // Notify parent of successful page load immediately!
        if (_realParent && _realParent !== window) {
          _realParent.postMessage({ type: 'NAVIGATE', tabId: tabId, url: currentRealUrl }, '*');
        }

        function getCssPath(el) {
            if (!(el instanceof Element)) return;
            var path = [];
            while (el.nodeType === Node.ELEMENT_NODE) {
                var selector = el.nodeName.toLowerCase();
                if (el.id) {
                    selector += '#' + el.id;
                    path.unshift(selector);
                    break;
                } else {
                    var sib = el, nth = 1;
                    while (sib = sib.previousElementSibling) {
                        if (sib.nodeName.toLowerCase() == selector) nth++;
                    }
                    if (nth != 1) selector += ":nth-of-type("+nth+")";
                }
                path.unshift(selector);
                el = el.parentNode;
            }
            return path.join(" > ");
        }

        var isSyncing = false;

        // Listen for actions from parent (Master -> Slaves sync)
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'EXEC_SYNC') {
            isSyncing = true;
            var action = e.data.action;
            var data = e.data.data;
            
            if (action === 'scroll') {
               var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
               window.scrollTo(0, data.pct * maxScroll);
            } else if (action === 'navigate') {
               window.location.href = data.url;
            } else if (action === 'click') {
               if (data.path) {
                 var el = document.querySelector(data.path);
                 if (el) {
                   var clickEvent = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
                   el.dispatchEvent(clickEvent);
                 }
               }
            } else if (action === 'change') {
               if (data.path) {
                 var el = document.querySelector(data.path);
                 if (el) {
                   el.value = data.value;
                   var changeEvent = new Event('change', { bubbles: true });
                   el.dispatchEvent(changeEvent);
                 }
               }
            }
            
            setTimeout(function() { isSyncing = false; }, 300);
          }
        });

        // Broadcast scroll events to parent
        window.addEventListener('scroll', function(e) {
          if (isSyncing) return;
          var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          var pct = maxScroll > 0 ? window.scrollY / maxScroll : 0;
          _realParent.postMessage({ type: 'SYNC_ACTION', tabId: tabId, action: 'scroll', data: { pct: pct } }, '*');
        }, {passive: true});

        // Broadcast change events to parent
        document.addEventListener('change', function(e) {
          if (isSyncing) return;
          var path = getCssPath(e.target);
          if (path && e.target.value !== undefined) {
             _realParent.postMessage({ type: 'SYNC_ACTION', tabId: tabId, action: 'change', data: { path: path, value: e.target.value } }, '*');
          }
        }, true);

        // Intercept all clicked links inside the proxy frame to update the parent browser UI
        document.addEventListener('click', function(e) {
          if (isSyncing) return;
          
          var path = getCssPath(e.target);
          if (path) {
             _realParent.postMessage({ type: 'SYNC_ACTION', tabId: tabId, action: 'click', data: { path: path } }, '*');
          }
          
          var target = e.target.closest('a');
          if (target && target.href) {
            var href = target.getAttribute('href');
            if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
              e.preventDefault();
              // Compute absolute target URL
              var absoluteUrl = new URL(href, document.baseURI).href;
              
              // Resolve to proxied URL so we stay inside the proxy!
              var searchParams = new URLSearchParams(window.location.search);
              searchParams.set('url', absoluteUrl);
              var proxiedUrl = window.location.pathname + '?' + searchParams.toString();
              
              // Ensure link stays inside current frame
              target.setAttribute('target', '_self');
              
              // Post message to parent iframe to update current navigation (updates the URL input and other tabs)
              _realParent.postMessage({ type: 'NAVIGATE', tabId: tabId, url: absoluteUrl }, '*');
              
              // Navigate this iframe directly to the proxied URL smoothly!
              window.location.href = proxiedUrl;
            }
          }
        }, true);

        // Intercept form submissions
        document.addEventListener('submit', function(e) {
          e.preventDefault();
          var form = e.target;
          var action = form.getAttribute('action') || '';
          var method = (form.getAttribute('method') || 'GET').toUpperCase();
          var absoluteUrl = new URL(action, document.baseURI).href;
          var finalUrl = absoluteUrl;
          
          if (method === 'GET') {
            var params = new URLSearchParams(new FormData(form)).toString();
            finalUrl = absoluteUrl + (absoluteUrl.includes('?') ? '&' : '?') + params;
          }
          
          // Post message to parent
          _realParent.postMessage({ type: 'NAVIGATE', tabId: tabId, url: finalUrl }, '*');
          
          // Build proxied URL
          var searchParams = new URLSearchParams(window.location.search);
          searchParams.set('url', finalUrl);
          var proxiedUrl = window.location.pathname + '?' + searchParams.toString();
          
          window.location.href = proxiedUrl;
        }, true);
      </script>
    `;

    // Inject our base tag and scripts right after <head>
    if (htmlContent.includes("<head>")) {
      htmlContent = htmlContent.replace("<head>", `<head>\n${baseTag}\n${scriptRewriteInterceptors}`);
    } else if (htmlContent.includes("<HEAD>")) {
      htmlContent = htmlContent.replace("<HEAD>", `<HEAD>\n${baseTag}\n${scriptRewriteInterceptors}`);
    } else {
      // If no head, prepended at beginning
      htmlContent = `${baseTag}\n${scriptRewriteInterceptors}\n${htmlContent}`;
    }

    res.header("Content-Type", "text/html; charset=utf-8");
    // Send updated HTML
    res.send(htmlContent);

  } catch (error: any) {
    res.status(500).send(`
      <div style="font-family: system-ui, sans-serif; padding: 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
        <h3 style="margin-top:0">Proxy Navigation Failed</h3>
        <p>Could not load the URL <strong>${formattedUrl}</strong> through selected proxy <strong>${selectedProxy.name} (${selectedProxy.ip})</strong>.</p>
        <p style="font-size: 13px; color: #555;">Reason: ${error.message}</p>
        <div style="margin-top: 15px; font-size: 12px; color: #888;">
          💡 Try entering a standard public URL like <code>wikipedia.org</code>, <code>example.com</code>, or verify if the target website permits server requests.
        </div>
      </div>
    `);
  } finally {
    activeProxyRequests = Math.max(0, activeProxyRequests - 1);
  }
});

// Configure Vite middleware in development or serve production build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only run the standalone listener if we are not running as a Vercel serverless function
if (typeof process !== "undefined" && !process.env.VERCEL) {
  startServer();
}
