import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delta Journal — Trading Journal",
  description: "A personal ETHUSD trading journal and performance dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
