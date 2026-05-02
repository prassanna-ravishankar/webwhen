import { DynamicMeta } from "@/components/DynamicMeta";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Steps } from "@/components/landing/Steps";
import { Cases } from "@/components/landing/Cases";
import { Manifesto } from "@/components/landing/Manifesto";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

/**
 * webwhen marketing landing page.
 *
 * Composition + visual reference:
 *   design/webwhen/ui_kits/marketing/{Nav,Hero,Steps,Cases,Manifesto}.jsx
 *   design/webwhen/ui_kits/marketing/marketing.css
 *
 * Brand voice + vocabulary: design/webwhen/README.md
 */
export default function Landing() {
  return (
    <>
      <DynamicMeta
        path="/"
        title="webwhen — the agent that waits for the web"
        description="Tell webwhen what to watch for in plain English. It will sit with the question, search the web on a schedule, and tell you the moment your condition is met."
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "webwhen",
            "applicationCategory": "WebApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "description":
              "Tell webwhen what to watch for in plain English. It searches the web on a schedule and tells you the moment your condition is met.",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="dot-bg" />
      <Nav />
      <main>
        <Hero />
        <Steps />
        <Cases />
        <Manifesto />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
