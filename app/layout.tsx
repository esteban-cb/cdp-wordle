import type { Metadata } from "next";
import "./globals.css";
import "./styles/passage.css"; // Import Passage CSS
import { AppProviders } from "./contexts/AppProviders";

/**
 * Metadata for the page
 */
export const metadata: Metadata = {
  title: "CDP Wordle",
  description: "Play Wordle with crypto rewards using Coinbase Developer Platform",
};

/**
 * Root layout for the page
 *
 * @param {object} props - The props for the root layout
 * @param {React.ReactNode} props.children - The children for the root layout
 * @returns {React.ReactNode} The root layout
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
        <AppProviders>
          {/* Header (Fixed Height) */}
          <header className="py-6 flex items-center justify-center relative bg-white dark:bg-gray-800 shadow-sm">
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CDP Wordle
              </h1>
            </div>
          </header>

          {/* Main Content (Dynamic, Grows but Doesn't Force Scroll) */}
          <main className="flex-grow flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">{children}</main>

          {/* Footer (Fixed Height) */}
          <footer className="py-4 text-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <p>© 2024 CDP Wordle. Built with Coinbase Developer Platform.</p>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
