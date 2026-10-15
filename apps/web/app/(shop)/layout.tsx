import { AuthProvider } from "../../lib/auth";
import { CartProvider } from "../../lib/cart";
import { ShopHeader } from "../../components/shop/ShopHeader";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen text-on-surface">
          <ShopHeader />
          <main className="pt-16">{children}</main>
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
