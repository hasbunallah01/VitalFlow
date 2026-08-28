import { LandingNav } from './landing-nav';
import { LandingHero } from './landing-hero';
import { LandingHowItWorks } from './landing-how-it-works';
import { LandingFooter } from './landing-footer';

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingHowItWorks />
      </main>
      <LandingFooter />
    </>
  );
}
