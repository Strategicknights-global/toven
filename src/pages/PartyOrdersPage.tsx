import React from 'react';
import Topbar from '../components/Topbar';
// Removed unused imports after footer extraction
import Footer from '../components/Footer';
import { usePlacementBanners } from '../stores/publicBannersStore';
import { getBannerAlt, getBannerImageSrc } from '../utils/bannerUtils';

const offerings = [
  {
    title: 'Full Buffet Service',
    desc: 'Perfect for weddings and large corporate events.',
    img: '/image1.webp'
  },
  {
    title: 'Snack Platters',
    desc: 'Ideal for meetings and casual get-togethers.',
    img: '/image2.webp'
  },
  {
    title: 'Corporate Lunch Boxes',
    desc: 'Individual, hygienic, and delicious meals for your team.',
    img: '/image3.webp'
  },
  {
    title: 'Desserts & Add-ons',
    desc: 'Custom cakes, sweets, and more for your event.',
    img: '/image4.webp'
  },
];

const PartyOrdersPage: React.FC = () => {
  const { banners: partyBanners } = usePlacementBanners('party-orders');
  const heroBanner = partyBanners[0];
  const heroBannerSrc = getBannerImageSrc(heroBanner);
  const heroBannerAlt = getBannerAlt(heroBanner, 'Party orders hero banner');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar active="Party Orders" />
      <main className="mt-20 max-w-7xl mx-auto px-6 lg:px-10 w-full">
        {/* Hero image card */}
        {heroBannerSrc && (
          <div className="rounded shadow-lg overflow-hidden mb-12 sm:mb-16 relative bg-black rounded-[2rem]">
            <img
              src={heroBannerSrc}
              alt={heroBannerAlt}
              className="w-full h-64 sm:h-80 md:h-[520px] lg:h-[680px] object-cover"
              onError={(event) => {
                const target = event.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const container = target.closest('div');
                if (container) {
                  (container as HTMLElement).style.display = 'none';
                }
              }}
            />
          </div>
        )}
        <div className="pb-4">
          <p
            className="text-gray-600 leading-relaxed max-w-3xl mx-auto mt-4 animate-slide-in-left"
            data-animate
            style={{ animationDelay: "0.22s", animationFillMode: "both" }}
          >
            “Turn every celebration into flavourful memory – without the kitchen stress”<br></br>
            We prepare, pack, and deliver with precision, so every guest is served perfectly.<br></br>
            All you need to do is celebrate — TOVEN takes care of the rest.

          </p>
        </div>
        <section>
          <div className='py-2'>
            <h2 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-10">Explore Our <span className="text-[#510088]">Offerings</span></h2>
            <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-17" />

            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {offerings.map((o, i) => (
                <div
                  key={o.title}
                  className="rounded-2xl overflow-hidden float"
                  style={{ animationDelay: `${i * 0.2}s` }} // staggered floating
                >
                  <img
                    src={o.img}
                    alt={o.title}
                    className="w-full h-40 object-cover"
                  />
                </div>
              ))}
            </div>
            <style>
              {`
                @keyframes float {
                0% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
                100% { transform: translateY(0); }
                }

                .float {
                animation: float 3s ease-in-out infinite;
                }
    `}
            </style>
          </div>
        </section>

        <section className='py-4'>
          <h2 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-10">We <span className="text-[#510088]">Special</span> At</h2>
          <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-17" />
          <div className="grid grid-cols-4 gap-6 px-4">
            {[
              { img: "banner1.png", title: "House Party" },
              { img: "banner2.png", title: "Birthday" },
              { img: "banner3.png", title: "Premium" },
              { img: "banner4.png", title: "Office" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-xl border-[#510088] border-2 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-medium text-gray-700 mt-2 text-center">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className='py-4'>
          <h2 className="text-center text-xl sm:text-2xl font-semibold text-gray-900 mb-10">What we <span className="text-[#510088]">Serve</span></h2>
          <img src="/line.png" alt="Curved underline" className="mx-auto w-32 -mt-17" />
          <div className="grid grid-cols-2 gap-4 p-2">
            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Door Delivery
            </div>

            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Bulk Food
            </div>

            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Buffet
            </div>

            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Give Experience 
            </div>

            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Snack Box
            </div>

            <div className="border border-[#510088] border-2 rounded-xl p-4 text-center font-medium text-gray-700">
              Meal Box
            </div>
          </div>

        </section>

      </main>
      <Footer />
    </div>
  );
};

export default PartyOrdersPage;