export interface ProxyConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: 'HTTP' | 'SOCKS5' | 'HTTPS';
  location: string;
  isp: string;
  status: 'active' | 'inactive' | 'testing';
  latency?: number;
  username?: string;
  password?: string;
}

export interface TabConfig {
  id: string;
  name: string;
  device: string;
  userAgent: string;
  width: number;
  height: number;
  proxyId: string; // References a ProxyConfig ID
  currentUrl: string;
  history: string[];
}

export interface DevicePreset {
  name: string;
  userAgent: string;
  width: number;
  height: number;
  icon: string;
}
