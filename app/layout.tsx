import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const title = "Workout Tracker";
const description =
  "Record your workouts, track sets and rest times, and build consistency.";

export const metadata: Metadata = {
  // Set SITE_URL to the public HTTPS origin in the deployment environment.
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  applicationName: title,
  title,
  description,
  // These routes contain a private training application, not public content.
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: title,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
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
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
