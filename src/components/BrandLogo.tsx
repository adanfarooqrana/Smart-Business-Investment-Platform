import type { CSSProperties } from "react";

type BrandLogoProps = {
  className?: string;
  style?: CSSProperties;
};

export function BrandLogo({ className = "h-11 w-11", style }: BrandLogoProps) {
  return <img src="/images/investbiz-logo.webp" alt="InvestBiz" className={"shrink-0 object-contain " + className} style={style} />;
}
