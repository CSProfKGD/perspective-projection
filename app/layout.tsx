import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

const title = "Perspective Projection";
const description =
  "An interactive 3D explainer for pinhole-camera perspective projection.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
