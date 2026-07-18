import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Specialties } from "@/components/Specialties";
import { BookingSection } from "@/components/BookingSection";
import { Resources } from "@/components/Resources";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Specialties />
        <BookingSection />
        <Resources />
      </main>
      <Footer />
    </>
  );
}
