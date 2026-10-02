import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { AiChatWidget } from "@/components/public/ai-chat-widget";
import { IntroSplash } from "@/components/public/intro-splash";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <IntroSplash />
      <SiteHeader />
      <main className="flex-1 pt-[72px] sm:pt-[84px]">{children}</main>
      <SiteFooter />
      <AiChatWidget />
    </div>
  );
}
