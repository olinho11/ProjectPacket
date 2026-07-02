import type { Metadata } from "next";
import "@/app/globals.css";
import { ProjectPacketProvider } from "@/src/store";

export const metadata: Metadata = {
  title: "ProjectPacket",
  description: "Collect client project assets without chasing email threads."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProjectPacketProvider>{children}</ProjectPacketProvider>
      </body>
    </html>
  );
}
