import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { MotionProvider } from "./components/motion-provider";
import { SectionLink } from "./components/section-link";

export const metadata: Metadata = {
  title: { default: "Zentro", template: "%s | Zentro" },
  description: "Individual meeting scheduling",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SectionLink className="skip-link" href="#main-content">
          Skip to content
        </SectionLink>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
