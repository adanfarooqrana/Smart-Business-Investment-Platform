import { BrandLogo } from "@/components/BrandLogo";
import { Link } from "@tanstack/react-router";
import { Home, Bot, TrendingUp, DollarSign, Boxes } from "lucide-react";
import { useState } from "react";
import RedditCommunityModal from "@/components/RedditCommunityModal";

export function SiteHeader() {
  const [activeTab, setActiveTab] = useState("home");
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (id === "home") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    document.getElementById(id === "consultant" ? "ai-investment-agent" : id === "investing" ? "how" : id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const dockItems = [
    { id: "home", icon: <Home />, label: "Home" },
    { id: "consultant", icon: <Bot />, label: "AI Salesperson" },
    { id: "wholesale", icon: <Boxes />, label: "Wholesale" },
    { id: "investing", icon: <TrendingUp />, label: "Investing" },
    { id: "pricing", icon: <DollarSign />, label: "Pricing" },
    { id: "feedback", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4h16v12H10l-6 4V4Z" strokeLinejoin="round" /><path d="M8 8h8m-8 4h5" strokeLinecap="round" /></svg>, label: "Feedback" },
  ];

  return (
    <>
      <header className="ib-site-header sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl transition-all duration-300">
        <div className="ib-header-inner mx-auto flex h-20 max-w-[1600px] w-[95%] items-center justify-between px-5">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <BrandLogo className="h-11 w-11" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              InvestBiz
            </span>
          </Link>

          {/* Modern High-Fidelity Dock inline in the header */}
          <div className="ib-header-navcontainer">
            <nav className="ib-nav" aria-label="Landing navigation">
              {dockItems.map(item => <a key={item.id} href={item.id === "home" ? "#top" : "#" + (item.id === "consultant" ? "ai-investment-agent" : item.id === "investing" ? "how" : item.id)}
                title={item.label} aria-current={activeTab === item.id ? "location" : undefined}
                onClick={event => { event.preventDefault(); handleNavClick(item.id); }}>{item.icon}<span>{item.label}</span></a>)}
            </nav>
          </div>

          {/* CTA Buttons */}
          <div className="ib-header-actions flex items-center gap-3 shrink-0">
            {/* Join Community Button styled as white background, black text */}
            <Link
              to="/app/community"
              search={{ entry: "public" }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-4.5 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50 transition duration-200 shadow-sm cursor-pointer animate-pulse-glow"
            >
              <svg className="h-4.5 w-4.5 fill-orange-500" viewBox="0 0 20 20">
                <path d="M17.17 9.83a2.22 2.22 0 0 0-2.22-2.22c-.32 0-.62.07-.9.19-1.12-.82-2.64-1.34-4.33-1.4l.92-2.88 3 .65c0 .77.62 1.4 1.39 1.4a1.4 1.4 0 1 0-1.4-1.4c0 .07 0 .14.02.2l-3.23-.7a.44.44 0 0 0-.53.31l-.98 3.06c-1.74.04-3.3.56-4.44 1.4a2.22 2.22 0 0 0-3.12 3.12c0 .24.04.47.12.69-1.03.88-1.63 2.1-1.63 3.42 0 2.73 3.65 4.95 8.13 4.95s8.13-2.22 8.13-4.95c0-1.33-.6-2.54-1.63-3.42a2.16 2.16 0 0 0 .11-.69zM6.88 11.23a1.22 1.22 0 1 1 0-2.44 1.22 1.22 0 0 1 0 2.44zm6.24 3.7c-1 .99-2.88.99-3.87 0a.38.38 0 0 1 .53-.53c.69.7 2.12.7 2.8 0a.38.38 0 0 1 .54.53zm-.33-3.7a1.22 1.22 0 1 1 0-2.44 1.22 1.22 0 0 1 0 2.44z"/>
              </svg>
              <span>Join Community</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 mx-1.5 hidden md:block" />

            <Link
              to="/app/login"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              to="/app/register"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 duration-200 shadow-md"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

