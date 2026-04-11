import "./globals.css";

export const metadata = {
  title: "Todo Card",
  description: "Accessible task card built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
