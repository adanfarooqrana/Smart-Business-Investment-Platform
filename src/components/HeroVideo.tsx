// "Live" ambient background.
// Provides a clean, white background with soft, ambient orange/amber blur glows.
export function HeroVideo() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-white">
      {/* Modern gradient overlay for seamless blending with other sections */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none" />
      
      {/* Soft orange/amber ambient blur glows */}
      <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-orange-100/30 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-100/20 blur-[120px] pointer-events-none" />
    </div>
  );
}
