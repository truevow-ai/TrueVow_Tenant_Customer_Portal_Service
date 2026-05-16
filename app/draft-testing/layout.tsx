import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "DRAFT Testing Portal | TrueVow",
  description: "Isolated testing environment for DRAFT Service integration",
};

export default function DraftTestingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

