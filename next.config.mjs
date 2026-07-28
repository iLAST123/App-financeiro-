/**
 * No GitHub Pages o site vive em https://ilast123.github.io/App-financeiro-/,
 * então o build de produção precisa de basePath/assetPrefix (via env
 * NEXT_PUBLIC_BASE_PATH, setada no workflow). Localmente nada muda.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
