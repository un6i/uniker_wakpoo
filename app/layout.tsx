import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-static";

const title = "WAKPOO | Crush your schedule!";
const description = "할 일을 버블로 관리하고 집중 미션을 완료하는 생산성 프로토타입";
const siteUrl = "https://un6i.github.io/uniker_wakpoo/";
const socialImageUrl = `${siteUrl}og.png`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    url: siteUrl,
    images: [{ url: socialImageUrl, width: 1747, height: 909, alt: "WAKPOO social preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImageUrl],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
