import { db } from "../firebase";
import { ref, update } from "firebase/database";
import { BusinessOwnerService } from "./businessOwnerService";
import { extractThemeFromPrompt, resolveSiteTheme, type SiteTheme } from "../lib/siteTheme";
import { pickProductImages, resolveIndustryAssets } from "../lib/industryAssets";

export class GeminiService {
  static async generateWebsiteFromPrompt(
    uid: string,
    businessName: string,
    userPrompt: string
  ): Promise<{ success: boolean; subdomain: string }> {
    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error("Groq API key is not configured in .env file.");
    }

    const masterTemplate = {
      theme_color: "#d97706",
      background_color: "#f8fafc",
      text_color: "#1e293b",
      heading_color: "#0f172a",
      hero_background: "#0f172a",
      font_family: "modern",
      banner_title: "Welcome to Our Premium Store",
      banner_description: "Exquisite products generated to fit your personal style and needs.",
      products: [
        {
          name: "Sample Product",
          description: "High quality curated catalog item.",
          price: 1500,
        },
      ],
    };

    const systemPrompt =
      "You are an expert web designer. Return ONLY a raw valid JSON string matching the master template structure. " +
      "Do NOT wrap in markdown (no ```), HTML, or conversational text. " +
      "IMPORTANT: Read the user prompt carefully for design requests — background color, text color, heading color, " +
      "theme/accent color, hero/banner background, and font style. " +
      "font_family must be one of: modern, elegant, bold, classic, tech, friendly. " +
      "All colors must be hex codes like #0a0a0a. If the user asks for black background, set background_color to #0a0a0a " +
      "and use light text colors. If no design is specified, choose a tasteful palette for the business niche.";

    const userPromptContent =
      `Business Name: "${businessName}". Prompt: "${userPrompt}". ` +
      `Master Template: ${JSON.stringify(masterTemplate)}. ` +
      `Generate exactly 3 customized products fitting this business. ` +
      `Also set theme_color, background_color, text_color, heading_color, hero_background, and font_family from any design hints in the prompt.`;

    const url = "/api-groq/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptContent },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.statusText} (${errorText})`);
    }

    const result = await response.json();
    let generatedText = result.choices?.[0]?.message?.content;
    if (!generatedText) {
      throw new Error("Invalid response received from Groq AI model.");
    }

    generatedText = generatedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const aiConfig = JSON.parse(generatedText);

    // Prompt keywords override AI when user explicitly asks for colors/fonts
    const promptTheme = extractThemeFromPrompt(userPrompt);
    const theme: SiteTheme = resolveSiteTheme(
      {
        theme_color: promptTheme.theme_color || aiConfig.theme_color,
        background_color: promptTheme.background_color || aiConfig.background_color,
        text_color: promptTheme.text_color || aiConfig.text_color,
        heading_color: promptTheme.heading_color || aiConfig.heading_color,
        hero_background: promptTheme.hero_background || aiConfig.hero_background,
        font_family: promptTheme.font_family || aiConfig.font_family,
      },
      userPrompt,
    );

    // Industry-aware Unsplash assets from prompt keywords (fixes bakery-for-all bug)
    const industryPack = resolveIndustryAssets(userPrompt, businessName);
    const rawProducts = Array.isArray(aiConfig.products) ? aiConfig.products.slice(0, 3) : [];
    const productImagePairs = pickProductImages(industryPack, Math.max(rawProducts.length, 3));
    const productsObj: Record<string, any> = {};
    rawProducts.forEach((p: any, index: number) => {
      const id = `prod_${index + 1}`;
      const salePrice = Number(p.sale_price ?? p.price ?? 0) || 0;
      const realPrice = Number(p.real_price ?? Math.round(salePrice * 0.4)) || 0;
      const [primaryImage, secondaryImage] = productImagePairs[index] || industryPack.productImages;
      productsObj[id] = {
        id,
        name: String(p.name || `Product ${index + 1}`),
        description: String(p.description || ""),
        real_price: realPrice,
        sale_price: salePrice,
        original_price: Number(p.original_price ?? Math.round(salePrice * 1.1)) || salePrice,
        quantity: 50,
        images: [primaryImage, secondaryImage],
        industry_category: industryPack.category,
      };
    });

    const finalizeRes = await BusinessOwnerService.finalizeAiGeneratedWebsite(
      uid,
      businessName,
      {
        theme_color: theme.theme_color,
        background_color: theme.background_color,
        text_color: theme.text_color,
        heading_color: theme.heading_color,
        hero_background: theme.hero_background,
        font_family: theme.font_family,
        card_background: theme.card_background,
        nav_background: theme.nav_background,
        banner_title: aiConfig.banner_title,
        banner_description: aiConfig.banner_description,
        banner_image_url: industryPack.heroBanner,
        industry_category: industryPack.category,
        industry_label: industryPack.label,
      },
      productsObj,
    );

    await update(ref(db, `users/${uid}`), {
      landingPageCreated: true,
      subdomain: finalizeRes.subdomain,
    });

    return {
      success: true,
      subdomain: finalizeRes.subdomain,
    };
  }
}
