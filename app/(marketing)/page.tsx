import { LandingNav } from './_components/landing-nav';
import { LandingHero } from './_components/landing-hero';
import { LandingHowItWorks } from './_components/landing-how-it-works';
import { LandingFeatures } from './_components/landing-features';
import { LandingCta } from './_components/landing-cta';
import { LandingFooter } from './_components/landing-footer';

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </>
  );
}
