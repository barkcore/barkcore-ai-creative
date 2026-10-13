/** @type {import('next').NextConfig} */
const nextConfig = {
  // node:sqlite は Node 組み込み。バンドルせずそのまま読み込む
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
};
export default nextConfig;
