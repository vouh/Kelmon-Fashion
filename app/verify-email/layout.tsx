import { PRIVATE_PAGE } from "@/lib/seo";

/** The page is a client component, so its metadata lives here. Kept out of search results. */
export const metadata = { title: "Verify Email", ...PRIVATE_PAGE };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
