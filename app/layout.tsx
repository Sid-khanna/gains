import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Gains",
  description: "Workout, diet, bodyweight, and progress tracker",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workout", label: "Workout" },
  { href: "/progress", label: "Progress" },
  { href: "/diet", label: "Diet" },
  { href: "/body", label: "Body" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} bg-white text-black antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen">
            <header className="border-b bg-white">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                <Link href="/dashboard" className="text-xl font-semibold tracking-tight">
                  Gains
                </Link>
                <nav className="hidden gap-4 text-sm md:flex">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-zinc-600 transition hover:text-black"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="overflow-x-auto border-t md:hidden">
                <div className="flex min-w-max gap-4 px-4 py-3 text-sm">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="whitespace-nowrap text-zinc-600 transition hover:text-black"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}