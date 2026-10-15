export const mocks = {
  tenant: { id: "demo-tenant", name: "Mi Tienda Deportiva (tenant demo)", nit: "901.482.193-4" },
  kpis: { ventasHoy: "$38,450,000 COP", ordenes: 482, roas: "4.85x", stockCritico: 3 },
  products: [
    { name: "Zapatillas Pro Runner Nitro", sku: "SKU-RUN-8821-42", cat: "Calzado", regular: 389000, oferta: 329000, stock: 34, estado: "Publicado", aliada: "Aliado 15%" },
    { name: "Camiseta Compresión Elite", sku: "SKU-CMP-1049-M", cat: "Ropa Deportiva", regular: 125000, oferta: null, stock: 4, estado: "Publicado", aliada: "No compartido" },
    { name: "Mancuerna Hexagonal 15kg", sku: "SKU-FIT-9015-EA", cat: "Accesorios", regular: 195000, oferta: 175000, stock: 18, estado: "Publicado", aliada: "Aliado 12%" },
    { name: "Proteína IsoClean 2lb Vainilla", sku: "SKU-NUT-3022-VN", cat: "Suplementos", regular: 240000, oferta: 219000, stock: 52, estado: "Publicado", aliada: "Aliado 18%" },
    { name: "Straps GripMax", sku: "SKU-ACC-5520-UN", cat: "Accesorios", regular: 45000, oferta: null, stock: 2, estado: "Borrador", aliada: "No compartido" },
  ],
  orders: [
    { id: "SS-9801", bold: "bld_tx_893420198471", cliente: "Carlos Mendoza", ciudad: "Bogotá, D.C.", total: 189500, metodo: "Visa **** 4912", estado: "Pagado Bold" },
    { id: "SS-9802", bold: "bld_tx_492019481729", cliente: "Valentina Rios", ciudad: "Medellín", total: 345000, metodo: "Mastercard **** 8104", estado: "Pagado Bold" },
    { id: "SS-9803", bold: "bld_tx_pse_0029141", cliente: "Andrés Felipe Gómez", ciudad: "Cali", total: 120000, metodo: "PSE Bancolombia", estado: "Pendiente PSE" },
    { id: "SS-9804", bold: "bld_tx_901192849102", cliente: "Mariana Quintero", ciudad: "Barranquilla", total: 420000, metodo: "Visa **** 9920", estado: "Pagado Bold" },
    { id: "SS-9805", bold: "bld_tx_err_3910582", cliente: "Julián Restrepo", ciudad: "Bucaramanga", total: 210000, metodo: "Rechazada", estado: "Fallido Bold" },
    { id: "SS-9806", bold: "bld_tx_998471625341", cliente: "Diana Herrera", ciudad: "Cartagena", total: 275000, metodo: "Mastercard débito", estado: "Pagado Bold" },
  ],
  campaigns: [
    { nombre: "Retargeting Carrito Abandonado", formato: "Advantage+ Catalog · Stories & Reels", presupuesto: 20, gasto: 320, clics: 1410, ctr: "3.42%", compras: 124, roas: "7.8x", activa: true },
    { nombre: "Escala - Runner Nitro", formato: "Intereses Fitness · Feed + Reels", presupuesto: 50, gasto: 610, clics: 2890, ctr: "2.81%", compras: 118, roas: "4.9x", activa: true },
    { nombre: "Top Sellers Reels", formato: "UGC Creadores · Reels", presupuesto: 15, gasto: 240, clics: 1020, ctr: "3.95%", compras: 54, roas: "4.6x", activa: true },
    { nombre: "Flash Sale 30% OFF", formato: "Feed & Stories · Pausada", presupuesto: 10, gasto: 80, clics: 340, ctr: "1.90%", compras: 16, roas: "3.2x", activa: false },
  ],
};
export const cop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;
