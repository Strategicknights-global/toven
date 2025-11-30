import React, { useEffect } from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import Topbar from '../components/Topbar';
import Footer from '../components/Footer';
import { useConfigStore } from '../stores/configStore';
import { ROUTES } from '../AppRoutes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TERMS_LAST_UPDATED = 'October 6, 2025';

const TermsPage: React.FC = () => {
  const config = useConfigStore((state) => state.config);
  const loading = useConfigStore((state) => state.loading);
  const loaded = useConfigStore((state) => state.loaded);
  const loadConfig = useConfigStore((state) => state.loadConfig);

  useEffect(() => {
    if (!loaded && !loading) {
      void loadConfig();
    }
  }, [loaded, loading, loadConfig]);

  const checkoutTerms = (config?.checkoutTerms ?? '').trim();
  const hasCustomCheckoutTerms = checkoutTerms.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Topbar />

      {/* HERO */}
      <section className="relative mt-[4rem] bg-gradient-to-br from-[#5f2a91] via-purple-700 to-purple-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)]" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto px-6 lg:px-12 py-24 sm:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-purple-200 mb-4">Legal</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">Terms &amp; Conditions</h1>
          <p className="text-purple-100 max-w-3xl text-sm sm:text-base leading-relaxed">
            These Terms &amp; Conditions explain how Toven operates, what you can expect from us, and the responsibilities you agree to when using our services. Please review them carefully before placing your next order or subscription.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 text-xs sm:text-sm text-purple-100/90">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <ShieldCheck size={16} aria-hidden />
              Transparent service commitments
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <Clock size={16} aria-hidden />
              Last updated {TERMS_LAST_UPDATED}
            </span>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-6 lg:px-12 grid gap-12 lg:grid-cols-[minmax(0,260px)_1fr]">
            {/* Table of contents */}
            <aside className="lg:sticky lg:top-28 lg:self-start bg-purple-50/60 border border-purple-100 rounded-2xl p-6 h-fit shadow-sm">
              <h2 className="text-sm font-semibold text-[#4b1f71] uppercase tracking-wide mb-4">On this page</h2>
              <nav aria-label="Terms sections" className="space-y-3 text-sm text-purple-800/80">
                <a
                  href="#terms-content"
                  className="block rounded-lg px-3 py-2 transition hover:bg-white hover:shadow-sm hover:text-[#5f2a91]"
                >
                  Terms & Conditions
                </a>
              </nav>
              <div className="mt-6 rounded-xl border border-purple-200 bg-white p-4 text-xs text-slate-500">
                Need something else? Visit our{' '}
                <a href={ROUTES.CONTACT} className="text-[#5f2a91] font-semibold hover:underline">Contact page</a>.
              </div>
            </aside>

            {/* Terms content */}
            <article className="space-y-12">
              <section id="terms-content" className="scroll-mt-28">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">Terms & Conditions</h2>
                {loading && !loaded ? (
                  <p className="text-sm text-slate-500">Loading the latest terms…</p>
                ) : hasCustomCheckoutTerms ? (
                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {checkoutTerms}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The terms and conditions are currently being finalised. Please check again soon or contact our support team if you need a copy immediately.
                  </p>
                )}
              </section>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
