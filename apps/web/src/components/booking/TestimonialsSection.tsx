const testimonials = [
  {
    quote: 'An absolutely magical experience. The lodge exceeded every expectation with its stunning views and impeccable service.',
    author: 'Sarah Mitchell',
    location: 'New York, USA',
  },
  {
    quote: 'The most peaceful retreat we have ever visited. Waking up to nature and the warm hospitality made it unforgettable.',
    author: 'James & Emily Carter',
    location: 'London, UK',
  },
  {
    quote: 'From the private villa to the sunset views, every detail was perfect. We are already planning our return.',
    author: 'David Nakamura',
    location: 'Tokyo, Japan',
  },
];

function StarIcon() {
  return (
    <svg className="h-4 w-4 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="bg-stone-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="section-heading">Guest Experiences</h2>
          <div className="divider-gold mt-4" />
          <p className="mt-4 text-stone-500">What our guests say about their stay</p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-950/5"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <blockquote className="mt-4 font-serif text-base italic leading-relaxed text-stone-700">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-4 border-t border-stone-100 pt-4">
                <p className="text-sm font-semibold text-stone-900">{t.author}</p>
                <p className="text-xs text-stone-500">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
