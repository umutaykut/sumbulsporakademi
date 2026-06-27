import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sümbülspor Akademi", description: "Gelişim ve veli bilgilendirme sistemi" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="tr"><body>{children}</body></html>; }
