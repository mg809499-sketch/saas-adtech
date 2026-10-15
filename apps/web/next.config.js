/** @type {import('next').NextConfig} */
const consola = [
  "dashboard-central", "catalogo-inventario", "ordenes-pedidos", "meta-ads-studio",
  "red-aliada-afiliados", "pasarelas-pagos", "dominio-marca", "ajustes-sistema",
];
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  async redirects() {
    return [
      ...consola.map((p) => ({ source: `/${p}`, destination: `/consola/${p}`, permanent: false })),
      { source: "/tienda", destination: "/tiendas", permanent: false },
    ];
  },
};
module.exports = nextConfig;
