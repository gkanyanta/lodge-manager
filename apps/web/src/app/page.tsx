'use client';

import { useState, useEffect } from 'react';
import HeroSlideshow from '@/components/booking/HeroSlideshow';
import SearchForm from '@/components/booking/SearchForm';
import RoomCard from '@/components/booking/RoomCard';
import TestimonialsSection from '@/components/booking/TestimonialsSection';
import Footer from '@/components/booking/Footer';

const SHOWCASE_ROOMS = [
  {
    name: 'Standard Room',
    description: 'Comfortable room with essential amenities. Perfect for solo travelers or couples.',
    price: 85,
  },
  {
    name: 'Deluxe Room',
    description: 'Spacious room with premium furnishings and a beautiful garden view.',
    price: 150,
  },
  {
    name: 'Family Suite',
    description: 'Large suite with separate living area, ideal for families.',
    price: 250,
  },
  {
    name: 'Luxury Villa',
    description: 'Private villa with pool, perfect for a premium experience.',
    price: 450,
  },
];

const FEATURES = [
  {
    title: 'Breathtaking Location',
    description: 'Surrounded by natural beauty with stunning views from every angle.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    title: 'Exceptional Service',
    description: 'Our dedicated staff ensures every moment of your stay is perfect.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  },
  {
    title: 'Modern Comfort',
    description: 'Luxury amenities blended with rustic charm for the ultimate retreat.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Transparent Navbar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 shadow-sm backdrop-blur-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <span
              className={`font-serif text-xl font-bold transition-colors ${
                scrolled ? 'text-stone-900' : 'text-white'
              }`}
            >
              Sunset Lodge
            </span>
          </a>
          <a
            href="/booking/manage"
            className={`text-sm font-medium transition-colors min-h-[44px] flex items-center ${
              scrolled
                ? 'text-stone-600 hover:text-stone-900'
                : 'text-white/90 hover:text-white'
            }`}
          >
            Manage Booking
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 sm:px-6">
        <HeroSlideshow />

        <div className="relative z-10 w-full max-w-4xl text-center">
          <p className="animate-fade-in text-sm font-medium uppercase tracking-[0.25em] text-gold-400">
            Welcome to
          </p>
          <h1 className="mt-3 animate-fade-in font-serif text-4xl font-bold text-white sm:text-5xl lg:text-7xl">
            Sunset Lodge
          </h1>
          <div className="divider-gold mx-auto mt-5" />
          <p className="mx-auto mt-5 max-w-xl animate-slide-up text-base leading-relaxed text-white/80 sm:text-lg">
            Escape the everyday. Discover comfort, nature, and unforgettable
            experiences in our luxury lodge retreat.
          </p>

          <div className="mt-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <SearchForm variant="hero" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
          <svg
            className="h-6 w-6 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* Room Showcase */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="section-heading">Our Accommodations</h2>
            <div className="divider-gold mt-4" />
            <p className="mt-4 text-stone-500">
              Choose from our carefully curated selection of rooms and suites
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWCASE_ROOMS.map((room) => (
              <RoomCard
                key={room.name}
                variant="showcase"
                name={room.name}
                description={room.description}
                price={room.price}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-stone-900 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Why Choose Us
            </h2>
            <div className="divider-gold mt-4" />
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/10 text-gold-400">
                  {feature.icon}
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
