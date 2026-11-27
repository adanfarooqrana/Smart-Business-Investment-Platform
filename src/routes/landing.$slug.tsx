import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { 
  Star, Quote, Heart, Clock, MapPin, Phone, Mail, 
  Sparkles, CheckCircle2, ChevronRight, MessageSquare, Plus, ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/landing/$slug")({
  component: LiveLandingPage,
});

// A library of premium designs/templates for the public pages
const TEMPLATES: Record<string, {
  name: string;
  theme: string;
  bgClass: string;
  accentClass: string;
  cardClass: string;
  fontClass: string;
  heroImage: string;
}> = {
  // Food & Beverage Templates
  "cafe-modern": {
    name: "Urban Cafe Modern",
    theme: "food",
    bgClass: "bg-[#faf8f5] text-[#2c2520]",
    accentClass: "bg-[#c5a880] text-white hover:bg-[#b2946c]",
    cardClass: "bg-white border-[#f3eee7] border shadow-sm",
    fontClass: "font-serif",
    heroImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
  },
  "bistro-gourmet": {
    name: "Gourmet Bistro Dark",
    theme: "food",
    bgClass: "bg-[#12161a] text-[#f1f3f5] border-slate-800",
    accentClass: "bg-[#e5a93b] text-[#12161a] hover:bg-[#cca229]",
    cardClass: "bg-[#1c2227] border-slate-800/60 border shadow-md",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
  },
  "bakery-sweet": {
    name: "Sweet Bakery Delight",
    theme: "food",
    bgClass: "bg-[#fff5f5] text-[#4a3535]",
    accentClass: "bg-[#ff8da1] text-white hover:bg-[#ff758c]",
    cardClass: "bg-white border-[#ffe3e3] border shadow-sm",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
  },
  "pizzeria-traditional": {
    name: "Traditional Rustic Pizza",
    theme: "food",
    bgClass: "bg-[#fbfaf7] text-[#2a231d]",
    accentClass: "bg-[#e05a47] text-white hover:bg-[#c94b39]",
    cardClass: "bg-white border-[#f5efdf] border shadow-sm",
    fontClass: "font-serif",
    heroImage: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
  },

  // SaaS / Tech Templates
  "saas-sleek": {
    name: "SaaS Enterprise Dark",
    theme: "saas",
    bgClass: "bg-[#090b11] text-[#e2e8f0]",
    accentClass: "bg-[#6366f1] text-white hover:bg-[#4f46e5]",
    cardClass: "bg-[#111625] border-slate-800/80 border shadow-xl",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80",
  },
  "saas-minimal": {
    name: "SaaS Minimal Light",
    theme: "saas",
    bgClass: "bg-[#f8fafc] text-[#0f172a]",
    accentClass: "bg-[#0284c7] text-white hover:bg-[#0369a1]",
    cardClass: "bg-white border-slate-100 border shadow-sm",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
  },

  // Retail & E-commerce Templates
  "retail-boutique": {
    name: "Luxury Apparel Boutique",
    theme: "retail",
    bgClass: "bg-[#fcfbfc] text-[#1c1917]",
    accentClass: "bg-[#7c2d12] text-white hover:bg-[#6c2810]",
    cardClass: "bg-white border-[#f5f2f0] border shadow-sm",
    fontClass: "font-serif",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80",
  },
  "retail-green": {
    name: "Organic Grocers",
    theme: "retail",
    bgClass: "bg-[#fcfdfa] text-[#1e2d24]",
    accentClass: "bg-[#15803d] text-white hover:bg-[#166534]",
    cardClass: "bg-white border-[#f0f4ee] border shadow-sm",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
  },

  // Professional Services Templates
  "agency-creative": {
    name: "Creative Studio",
    theme: "services",
    bgClass: "bg-white text-[#111111]",
    accentClass: "bg-[#ec4899] text-white hover:bg-[#db2777]",
    cardClass: "bg-secondary/40 border-slate-100 border shadow-sm",
    fontClass: "font-sans",
    heroImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  },
  "consulting-prestige": {
    name: "Prestige Advisory",
    theme: "services",
    bgClass: "bg-[#0b0f19] text-[#e2e8f0]",
    accentClass: "bg-[#c5a880] text-[#0b0f19] hover:bg-[#b2946c]",
    cardClass: "bg-[#121b2d] border-[#1b2b48] border shadow-lg",
    fontClass: "font-serif",
    heroImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
  }
};

function LiveLandingPage() {
  const { business, addReview, recordLandingPageVisit } = useAppState();
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  // Track page visits
  useEffect(() => {
    recordLandingPageVisit();
  }, []);

  // Determine active template or fallback
  const activeTemplateKey = business.landingPageTemplate || "cafe-modern";
  const activeTemplate = TEMPLATES[activeTemplateKey] || TEMPLATES["cafe-modern"];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewText) {
      alert("Please fill in your name and review message.");
      return;
    }

    addReview({
      name: reviewName,
      rating: reviewRating,
      text: reviewText,
    });

    setReviewName("");
    setReviewText("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const currentBusinessName = business.isRegistered ? business.name : "Luna Bistro";
  const currentCategory = business.isRegistered ? business.category : "Food & Beverage";
  const currentSubcategory = business.isRegistered ? business.subcategory : "Organic Gourmet Cafe";
  const currentAbout = business.landingPageAbout || business.about || "A highly rated ecosystem business committed to quality and digital reputation transparency.";
  const currentReviews = business.reviews;

  return (
    <div className={`min-h-screen ${activeTemplate.bgClass} ${activeTemplate.fontClass} transition-colors duration-500`}>
      {/* Dynamic Header */}
      <header className="border-b border-current/10 py-5">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
            <span className="font-bold text-lg tracking-tight uppercase">{currentBusinessName}</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium opacity-80">
            <a href="#about" className="hover:opacity-100 transition-opacity">About</a>
            <a href="#menu" className="hover:opacity-100 transition-opacity">Offerings</a>
            <a href="#reviews" className="hover:opacity-100 transition-opacity">Customer Reviews</a>
            <a href="#contact" className="hover:opacity-100 transition-opacity">Get in Touch</a>
          </nav>

          <Link
            to="/app/score"
            className="rounded-full border border-current/20 px-4 py-1.5 text-xs font-semibold hover:bg-current/5 transition-all inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 border-b border-current/5">
        <div className="mx-auto max-w-6xl px-6 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-current/5 px-3.5 py-1 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verified InvestBiz Reputation Profile</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Crafted in {business.isRegistered ? business.location : "San Francisco"}
            </h1>
            <p className="text-base md:text-lg opacity-85 leading-relaxed">
              Welcome to <strong>{currentBusinessName}</strong>. {currentAbout}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <a
                href="#reviews"
                className={`rounded-full px-6 py-3 text-sm font-semibold tracking-wider transition-all shadow-md ${activeTemplate.accentClass}`}
              >
                Submit Review
              </a>
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold opacity-80">({currentReviews.length} Reviews)</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-current/5 to-transparent rounded-3xl -z-10" />
            <img
              src={activeTemplate.heroImage}
              alt="Workspace image"
              className="rounded-3xl shadow-xl w-full object-cover aspect-[4/3] border border-current/10"
            />
          </div>
        </div>
      </section>

      {/* Business Details & Stats */}
      <section id="about" className="py-12 border-b border-current/5">
        <div className="mx-auto max-w-6xl px-6 grid gap-6 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Category", val: currentCategory },
            { label: "Business Type", val: currentSubcategory },
            { label: "Location", val: business.isRegistered ? business.location : "USA" },
            { label: "Ecosystem Score", val: `${business.score || 85} / 100` }
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-5 text-center ${activeTemplate.cardClass}`}>
              <div className="text-xs uppercase tracking-wider opacity-60 mb-1">{stat.label}</div>
              <div className="text-base font-bold">{stat.val}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Offerings Section */}
      <section id="menu" className="py-16 md:py-24 border-b border-current/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Our Signature Offerings</h2>
            <p className="mt-3 opacity-75">Take a look at what we do best. Quality and details standard to perfection.</p>
          </div>

          {/* Dynamic layout depending on theme */}
          {activeTemplate.theme === "food" ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Specialist Brew Latte", desc: "Organic roasted coffee with homemade almond foam.", price: "$6.50" },
                { title: "Signature Farm Avocado Sourdough", desc: "Fresh eggs, cherry tomatoes, and microgreens.", price: "$14.00" },
                { title: "Gourmet Almond Croissant", desc: "Flaky french pastry baked daily in house.", price: "$5.50" }
              ].map((item) => (
                <div key={item.title} className={`rounded-2xl p-6 relative ${activeTemplate.cardClass}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <span className="font-bold opacity-90">{item.price}</span>
                  </div>
                  <p className="text-sm opacity-80 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          ) : activeTemplate.theme === "saas" ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Developer Sandbox Seat", desc: "API integrations, telemetry panels, standard SLA.", price: "$29/mo" },
                { title: "AI Enterprise Growth Suite", desc: "Advanced cognitive models, fine-tuned matching logic.", price: "$149/mo" },
                { title: "Custom Ecosystem Design", desc: "Dedicated cloud clusters, active reputation monitoring.", price: "Custom" }
              ].map((item) => (
                <div key={item.title} className={`rounded-2xl p-6 relative ${activeTemplate.cardClass}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <span className="font-bold opacity-90">{item.price}</span>
                  </div>
                  <p className="text-sm opacity-80 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "Initial Strategic Consultation", desc: "Full roadmap creation and target scoping.", price: "Free" },
                { title: "Execution Boost Audit", desc: "Analyzing conversion bottlenecks, 5 key solutions.", price: "$450" },
                { title: "Ecosystem Integration Services", desc: "Complete custom dashboard syncing.", price: "$1,200" }
              ].map((item) => (
                <div key={item.title} className={`rounded-2xl p-6 relative ${activeTemplate.cardClass}`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{item.title}</h4>
                    <span className="font-bold opacity-90">{item.price}</span>
                  </div>
                  <p className="text-sm opacity-80 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Active Deals / Promotions display */}
          {business.deals && business.deals.length > 0 && (
            <div className="mt-12 rounded-3xl border border-dashed border-current/20 p-8 text-center bg-current/5 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-semibold text-red-500 mb-3 animate-pulse">
                <Heart className="h-3.5 w-3.5 fill-current" /> Active Special Promotion
              </div>
              <h3 className="text-2xl font-bold">Limited Time Deals</h3>
              <div className="mt-6 grid gap-4 md:grid-cols-2 text-left">
                {business.deals.map((deal) => (
                  <div key={deal.id} className={`rounded-xl p-5 ${activeTemplate.cardClass}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-red-500">{deal.discount} OFF</span>
                      <span className="text-xs opacity-60 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Valid Today
                      </span>
                    </div>
                    <h4 className="font-bold text-base">{deal.title}</h4>
                    <p className="text-xs opacity-80 mt-1">{deal.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Reviews & Form Section */}
      <section id="reviews" className="py-16 md:py-24 border-b border-current/5">
        <div className="mx-auto max-w-6xl px-6 grid gap-12 md:grid-cols-2">
          {/* Recent Reviews List */}
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Customer Sentiments</h2>
              <p className="mt-2 opacity-75">Recent feedback compiled live on our ecosystem score ledger.</p>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {currentReviews.length === 0 ? (
                <div className={`rounded-2xl p-6 text-center ${activeTemplate.cardClass}`}>
                  <p className="opacity-75 text-sm">No reviews yet. Be the first to leave feedback below!</p>
                </div>
              ) : (
                currentReviews.map((rev) => (
                  <div key={rev.id} className={`rounded-2xl p-5 relative ${activeTemplate.cardClass} animate-in fade-in duration-300`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-sm">{rev.name}</h4>
                        <span className="text-[10px] opacity-60">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" /> {rev.rating}
                      </div>
                    </div>
                    <p className="text-sm opacity-80 leading-relaxed italic">"{rev.text}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Leave a Review Form */}
          <div className={`rounded-3xl p-8 ${activeTemplate.cardClass}`}>
            <h3 className="text-2xl font-bold mb-2">Leave Your Review</h3>
            <p className="text-xs opacity-75 mb-6">Your feedback instantly syncs to our reputation score ledger.</p>

            {submitted && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-500">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                <div>
                  <span className="font-bold block mb-0.5">Review Submitted!</span>
                  <span>Thank you for your feedback! Your review has been saved and the Reputation Score has been updated in the sandbox.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-75">Your Name</label>
                <Input
                  className="bg-transparent border-current/20 focus:border-current/40"
                  placeholder="Jane Doe"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-75 block">Rating</label>
                <div className="flex gap-2 pt-1.5">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReviewRating(val)}
                      className={`h-9 w-9 rounded-full border border-current/25 flex items-center justify-center transition-colors ${
                        val <= reviewRating 
                          ? "bg-amber-500 border-amber-500 text-white" 
                          : "hover:bg-current/5"
                      }`}
                    >
                      <Star className={`h-4.5 w-4.5 ${val <= reviewRating ? "fill-current" : ""}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-75">Review Details</label>
                <Textarea
                  className="bg-transparent border-current/20 focus:border-current/40"
                  rows={4}
                  placeholder="Explain your experience with our services, products, or team..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`w-full rounded-full py-3 text-sm font-semibold tracking-wider transition-all shadow-md ${activeTemplate.accentClass}`}
              >
                Sync Review & Boost Score
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-current/10 opacity-80 text-xs">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} {currentBusinessName}. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>AI Landing Page Generator Suite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
