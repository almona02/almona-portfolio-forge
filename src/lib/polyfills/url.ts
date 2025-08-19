// URL polyfill for browser compatibility
const urlModule = {
  parse: (urlString: string) => {
    try {
      const parsed = new URL(urlString);
      return {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        host: parsed.host,
        href: parsed.href
      };
    } catch (e) {
      return null;
    }
  },
  format: (urlObject: Record<string, unknown>) => {
    if (typeof urlObject === 'string') return urlObject;
    
    const protocol = urlObject.protocol || 'http:';
    const hostname = urlObject.hostname || urlObject.host || 'localhost';
    const port = urlObject.port ? `:${urlObject.port}` : '';
    const pathname = urlObject.pathname || '/';
    const search = urlObject.search || '';
    const hash = urlObject.hash || '';
    
    return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
  },
  resolve: (from: string, to: string) => {
    try {
      return new URL(to, from).href;
    } catch (e) {
      return to;
    }
  }
};

export default urlModule;
export const { parse, format, resolve } = urlModule;
