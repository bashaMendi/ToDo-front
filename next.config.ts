import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
// Prefer default (false) to avoid /path/ vs /path differences
trailingSlash: false,
  
};

export default nextConfig;
