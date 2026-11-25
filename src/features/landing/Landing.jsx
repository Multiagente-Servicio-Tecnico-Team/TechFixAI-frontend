import Navbar from "./sections/Navbar.jsx";
import Hero from "./sections/Hero.jsx";
import Team from "./sections/Team.jsx";
import Flow from "./sections/Flow.jsx";
import Agents from "./sections/Agents.jsx";
import Metrics from "./sections/Metrics.jsx";
import Experiences from "./sections/Experiences.jsx";
import Security from "./sections/Security.jsx";
import CallToAction from "./sections/CallToAction.jsx";
import Footer from "./sections/Footer.jsx";

export default function Landing() {
  return (
    <>
      <Navbar />
      <main tabIndex={-1}>
        <Hero />
        <Team />
        <Flow />
        <Agents />
        <Metrics />
        <Experiences />
        <Security />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
