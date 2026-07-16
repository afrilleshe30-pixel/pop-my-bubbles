import "./globals.css";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({ 
  subsets: ["latin"],
  weight: ["400", "500", "600"] 
});

export const metadata = {
  title: "pop the bubbles ✨",
  description: "A gentle, no-pressure bubble wrap popping game for anxiety relief.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={fredoka.className}>{children}</body>
    </html>
  );
}