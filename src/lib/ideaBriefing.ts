import type { StartupIdea } from "@/data/startupIdeas";
import type { Founder, MarketProduct } from "@/components/investor/InvestorMarketplace";

export const IDEA_STAGES = [
  { id: 1 as const, label: "Stage 1", title: "Idea & Financial Terms", theme: "amber" as const },
  { id: 2 as const, label: "Stage 2", title: "Financial Requirements & Validation", theme: "orange" as const },
  { id: 3 as const, label: "Stage 3", title: "Payment", theme: "emerald" as const },
];

export type IdeaStage = (typeof IDEA_STAGES)[number]["id"];
export type IdeaBrief = {
  title: string;
  intro: string;
  steps: Record<IdeaStage, string>;
  terms?: Record<string, string>;
};

export const IDEA_STAGE_URDU: Record<IdeaStage, string> = {
  1: "کاروباری آئیڈیا اور مالی شرائط",
  2: "مالی ضروریات اور دستاویزات",
  3: "ادائیگی",
};
export const IDEA_TERM_URDU: Record<string, string> = {
  "Expected ROI": "متوقع منافع",
  "Equity Offered": "پیش کردہ ملکیتی حصہ",
  "Business Description": "کاروبار کی تفصیل",
  "Problem / Solution": "مسئلہ اور حل",
  "Industry Field": "کاروباری شعبہ",
};

const number = new Intl.NumberFormat("ur-PK");
const rupees = (value: number) => number.format(value) + " پاکستانی روپے";
const percentage = (value: string) => value.replaceAll("%", " فیصد");

export function liveIdeaBrief(idea: StartupIdea): IdeaBrief {
  const { stage1, stage2, stage3 } = idea;
  const raise = stage1.requiredInvestmentPkr || stage2.totalCapitalRequiredPkr;
  const roi = stage1.expectedRoi?.trim();
  const equity = stage1.equityOffered?.trim();
  const terms = [
    raise > 0 ? "بانی " + rupees(raise) + " کی سرمایہ کاری چاہتے ہیں۔" : "پچ میں سرمایہ کاری کا ہدف درج نہیں ہے۔",
    equity ? "پیش کردہ ملکیتی حصہ " + percentage(equity) + " ہے۔" : "",
    roi ? "بانی کا متوقع منافع " + percentage(roi) + " ہے۔ یہ ایک تخمینہ ہے۔" : "",
  ].filter(Boolean).join(" ");
  const evidence: string[] = [];
  if (stage2.proofGallery.length) evidence.push(number.format(stage2.proofGallery.length) + " ثبوت");
  if (stage2.productLiveUrl) evidence.push("پروڈکٹ کا لنک");
  if (stage2.expenseBreakdown.length) evidence.push("اخراجات کی تفصیل");
  const financialReview = evidence.length
    ? "پچ میں " + evidence.join("، ") + " شامل ہیں۔ ان کا موازنہ کاروباری ریکارڈ اور نقد آمد و رفت سے کریں۔"
    : "پچ میں پروڈکٹ کا لنک، اخراجات کی تفصیل یا ثبوت شامل نہیں ہیں۔ بانی سے اعداد و شمار کی بنیاد پوچھیں۔";
  return {
    title: idea.startupTitle,
    intro: "السلام علیکم! آئیے " + idea.startupTitle + " کی پچ دیکھیں۔ میں ہر مرحلے کے اہم نکات بتاؤں گا۔",
    steps: {
      1: terms,
      2: financialReview,
      3: stage3.legalAgreementText?.trim()
        ? "بانی نے معاہدے کی شرائط درج کی ہیں۔ دستخط سے پہلے رقم جاری ہونے کی شرط، تنازع حل کرنے کا طریقہ اور اپنے حقوق پڑھیں۔"
        : "بانی نے معاہدے کی مخصوص شرائط درج نہیں کیں۔ ادائیگی سے پہلے رقم واپس ہونے اور جاری ہونے کی شرائط معلوم کریں۔",
    },
    terms: {
      "Expected ROI": roi ? "بانی کا اندازہ " + percentage(roi) + " ہے۔ پوچھیں کہ یہ کس مدت، کن مفروضوں اور پچھلے کن نتائج پر مبنی ہے۔" : "بانی نے متوقع منافع درج نہیں کیا۔",
      "Equity Offered": equity ? "بانی کی پیشکش " + percentage(equity) + " ہے۔ دیکھیں کہ اس حصے کے ساتھ کون سے ملکیتی اور ووٹنگ حقوق ملتے ہیں۔" : "پچ میں ملکیتی حصے کی تفصیل درج نہیں ہے۔",
      "Business Description": stage1.ideaDescription
        ? "کاروبار کی تفصیل اسی پچ میں درج ہے۔ دیکھیں کہ آمدنی کس چیز سے آتی ہے، گاہک کون ہیں، اور بنیادی اخراجات کیا ہیں۔"
        : "کاروبار کی تفصیل درج نہیں کی گئی۔",
      "Problem / Solution": stage1.coreProblemSolution
        ? "بانی نے مسئلہ اور اس کا حل بیان کیا ہے۔ دیکھیں کہ گاہکوں کی ضرورت اور حل کی افادیت کے کیا ثبوت ہیں۔"
        : "بانی نے مسئلہ اور حل الگ سے بیان نہیں کیے۔",
      "Industry Field": "یہ پچ " + (idea.industry || "غیر متعین شعبے") + " سے متعلق ہے۔ اس کے مفروضوں کا اسی شعبے کے ملتے جلتے کاروبار سے موازنہ کریں۔",
    },
  };
}

export function showcaseIdeaBrief(product: MarketProduct, founder?: Founder): IdeaBrief {
  const total = product.totalProductChunks ?? 0;
  const sold = Math.min(total, product.soldChunks ?? 0);
  const available = Math.max(0, total - sold);
  const price = product.pricePerChunk ?? 0;
  return {
    title: product.title,
    intro: "السلام علیکم! آئیے " + product.title + (founder?.businessName ? "، " + founder.businessName + " کی پیشکش" : "") + " دیکھیں۔ یہ ایک ڈیمو ہے اور اعداد و شمار مثال کے لیے ہیں۔",
    steps: {
      1: "ہر ڈیمو یونٹ کی قیمت " + rupees(price) + " ہے۔ کل " + number.format(total) + " یونٹس میں سے " + number.format(sold) + " مختص ہو چکے ہیں۔ " + number.format(available) + " باقی ہیں۔",
      2: "درج قیمت کے مطابق مجموعی ہدف " + rupees(total * price) + " ہے۔ " +
        (product.averageRevenuePkr != null ? "مثالی ماہانہ آمدن " + rupees(product.averageRevenuePkr) + " ہے۔ " : "") +
        "طلب، اخراجات اور پیداواری گنجائش بدل سکتی ہے۔",
      3: available
        ? "ڈیمو ایسکرو میں رقم " + number.format(product.milestones?.length ?? 0) + " مراحل میں جاری ہوتی ہے۔ اس خریداری میں صرف ڈیمو فنڈز استعمال ہوتے ہیں۔"
        : "اس ڈیمو کے تمام یونٹس مختص ہو چکے ہیں۔ تفصیل بانی کے کیٹلاگ میں موجود ہے۔",
    },
  };
}
