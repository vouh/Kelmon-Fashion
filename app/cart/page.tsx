import Link from "next/link";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import { formatKes } from "@/lib/products";

const cartItems = [
  {
    id: "chanel-no5-mini",
    name: "Chanel No.5 Mini",
    variant: "Perfume • 30ml",
    price: 2500,
    quantity: 1,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAnl5g2pUXs3o6zRxUDi49RLz3mTqfRJIIBs1Bh_8b8sJ1X8YRQJUvrjyn1VrM4o3JfTjjBsMYs4i_-43iM7N1bI7oN-Y0XNCBT_W8y62JoAh0c3pvFpaep9r-1Rgr8fNVjfgHoJosJji7JbRlQsBMiMaeewa2bYOLzR63O3rv3JrD9_3UYR4_jbyrLVKVuK1TiJ3K52hLqD7TtRYOfBGR-L6YHfJZnnw8pRBnTmcb9nUhVpCoupBuo",
  },
  {
    id: "crossbody-mini-bag",
    name: "Crossbody Mini Bag",
    variant: "Accessories • Black",
    price: 3200,
    quantity: 1,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBYJib5L1ZSk7hIcw1_TqJr-2hc6EMooGn4J5bBBWQCmoWO2Y0ae8hFaTA5GJvDn2Kc83hRIDcpYR0AmqisupUNKMpfUQN0yKcZte1DdQakWNbsEO7nl87ivp29pwfEAx56dU9x0LEhRASsdWFzvqVaoBBNgWL77ZGGVGSW9d5bo9HSAWgzvQw4iMLaYo9qn_FnUoSlICSYu1NB-DNgW4sjIIHH5Tsxw1FRXjZm-gR0-BUhxVmmVgrR",
  },
  {
    id: "gel-polish-set",
    name: "Gel Polish Set",
    variant: "Beauty • Nude Palette",
    price: 1200,
    quantity: 2,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBKVZW3doGIwwPnm6ObpnwCLEPS_Eahz4zoon95MWZlNhAQbHEiK-2MDD3WGFNtsubr0zvnVQ4mqpFY_p03CapUArzxCjzhTPFSLj8WX32mP4hDLYaRz3oD4y_7kMp8vmSeWEZrguV7qLsEDy4QNKJnwcAvaTnAxnFvAPoKd2jDRekWo25wQ734PNXP7Xp1C0H1-IcRYoCe9rVybNSLvVdttXiS-YE4Nq4FbBXnmbe_b4XxwRlTleHK",
  },
];

const subtotal = 8100;
const delivery = 150;
const total = subtotal + delivery;

export default function CartPage() {
  return (
    <AppShell activeNav="cart" cartCount={3}>
      <main className="flex-1 mt-20 md:mt-0 px-margin-mobile md:px-margin-desktop py-lg max-w-4xl mx-auto w-full">
        <div className="flex justify-between items-end mb-8">
          <h1 className="font-display-md text-display-md text-on-surface">My Cart (3)</h1>
          <button className="font-body-md text-body-md text-on-surface-variant hover:text-error transition-colors underline underline-offset-4">
            Clear cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {cartItems.map((item) => (
              <div key={item.id} className="glass-panel p-4 rounded-xl flex gap-6 items-center group relative overflow-hidden transition-all duration-300 hover:bg-surface-container-highest">
                <div className="w-24 h-32 flex-shrink-0 bg-surface rounded-lg overflow-hidden relative">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                </div>
                <div className="flex-1 flex flex-col justify-between h-full py-2">
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface mb-1">{item.name}</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">{item.variant}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-body-lg text-body-lg text-secondary font-semibold">{formatKes(item.price)}</span>
                    <div className="flex items-center gap-3 bg-surface-container-lowest px-2 py-1 rounded-full border border-white/10">
                      <button className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full">
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="font-body-md text-body-md w-4 text-center">{item.quantity}</span>
                      <button className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button className="absolute top-4 right-4 text-outline hover:text-error transition-colors p-2">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="glass-panel p-6 rounded-xl sticky top-24">
              <h2 className="font-title-lg text-title-lg text-on-surface mb-6">Order Summary</h2>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">Subtotal</span>
                  <span className="font-body-md text-body-md text-on-surface">{formatKes(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface-variant">Delivery</span>
                  <span className="font-body-md text-body-md text-on-surface">{formatKes(delivery)}</span>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-secondary/50 to-transparent my-6" />
              <div className="flex justify-between items-end mb-8">
                <span className="font-body-lg text-body-lg text-on-surface">Total</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">{formatKes(total)}</span>
              </div>
              <Link
                href="/checkout"
                className="w-full h-[48px] bg-gradient-to-r from-primary to-inverse-primary rounded-lg flex items-center justify-center font-button-text text-button-text text-on-primary hover:shadow-[0_0_20px_rgba(236,178,255,0.4)] transition-all duration-300 group"
              >
                <span>Proceed to Checkout</span>
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <div className="mt-4 flex items-center justify-center gap-2 text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="font-label-caps text-label-caps lowercase">Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
