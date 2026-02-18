export default function Footer() {
  return (
    <footer className="bg-stone-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Lodge info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="font-serif text-lg font-bold text-white">Sunset Lodge</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              Nestled in nature, our lodge offers a perfect blend of luxury and tranquility for an unforgettable escape.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              Quick Links
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/" className="text-sm text-stone-400 transition-colors hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="/booking/manage" className="text-sm text-stone-400 transition-colors hover:text-white">
                  Manage Booking
                </a>
              </li>
              <li>
                <a href="/admin" className="text-sm text-stone-400 transition-colors hover:text-white">
                  Staff Login
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              Contact
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-stone-400">
              <li>123 Safari Road</li>
              <li>Cape Town, South Africa</li>
              <li>
                <a href="tel:+15550100" className="transition-colors hover:text-white">
                  +1-555-0100
                </a>
              </li>
              <li>
                <a href="mailto:info@sunsetlodge.com" className="transition-colors hover:text-white">
                  info@sunsetlodge.com
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-400">
              Front Desk
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-stone-400">
              <li>Check-in: 14:00</li>
              <li>Check-out: 11:00</li>
              <li>Reception: 24 hours</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-800 pt-6 text-center text-xs text-stone-500">
          <p>&copy; {new Date().getFullYear()} Sunset Lodge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
