/**
 * Deploy canônico: Vercel, servido na raiz — NEXT_PUBLIC_BASE_PATH fica vazio.
 * A env só existe para o caso de hospedar sob subpath (ex.: GitHub Pages);
 * localmente e na Vercel nada muda.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
