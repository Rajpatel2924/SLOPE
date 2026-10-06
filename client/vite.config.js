import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function validateProductionApiUrl(value) {
  const normalizedValue = value?.trim().replace(/\/+$/, '');

  if (!normalizedValue) {
    throw new Error('VITE_API_URL is required for production builds and must point to the Render API.');
  }

  let apiUrl;
  try {
    apiUrl = new URL(normalizedValue);
  } catch {
    throw new Error('VITE_API_URL must be a valid HTTPS URL ending in /api for production builds.');
  }

  if (
    apiUrl.protocol !== 'https:'
    || apiUrl.pathname !== '/api'
    || apiUrl.search
    || apiUrl.hash
    || apiUrl.username
    || apiUrl.password
  ) {
    throw new Error('VITE_API_URL must be a valid HTTPS URL ending in /api for production builds.');
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isVercelBuild = ['1', 'true'].includes(process.env.VERCEL);

  if (mode === 'production' && isVercelBuild) validateProductionApiUrl(env.VITE_API_URL);

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});
