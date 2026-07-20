import { db } from "../firebase";
import { ref, update } from "firebase/database";
import { BusinessOwnerService } from "./businessOwnerService";

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
      banner_title: "Welcome to Our Premium Store",
      banner_description: "Exquisite products generated to fit your personal style and needs.",
      products: [
        {
          name: "Sample Product",
          description: "High quality curated catalog item.",
          price: 1500
        }
      ]
    };

    const systemPrompt = "You are an expert web designer. Return ONLY a raw valid JSON string matching the master template structure. Do NOT wrap in markdown formatting (like ```json), HTML tags, or conversational text. Return only the JSON object.";
    const userPromptContent = `Business Name: "${businessName}". Prompt: "${userPrompt}". Master Template: ${JSON.stringify(masterTemplate)}. Generate exactly 3 customized products fitting this business.`;

    const url = "/api-groq/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptContent }
        ],
        temperature: 0.2
      })
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

    // Clean up markdown block wraps if present
    generatedText = generatedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    const aiConfig = JSON.parse(generatedText);

    // Provide high-quality Unsplash image URLs to make the products look beautiful out-of-the-box
    const sampleImages = [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80", // cake
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80", // pastry
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", // food
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80", // tech
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80"  // retail
    ];

    // Normalize AI products into the canonical Firebase product schema
    const rawProducts = Array.isArray(aiConfig.products) ? aiConfig.products.slice(0, 3) : [];
    const productsObj: Record<string, any> = {};
    rawProducts.forEach((p: any, index: number) => {
      const id = `prod_${index + 1}`;
      const salePrice = Number(p.sale_price ?? p.price ?? 0) || 0;
      const realPrice = Number(p.real_price ?? Math.round(salePrice * 0.4)) || 0;
      const primaryImage = sampleImages[index % sampleImages.length];
      const secondaryImage = sampleImages[(index + 1) % sampleImages.length];
      productsObj[id] = {
        id,
        name: String(p.name || `Product ${index + 1}`),
        description: String(p.description || ""),
        real_price: realPrice,
        sale_price: salePrice,
        quantity: 50,
        images: [primaryImage, secondaryImage],
      };
    });

    // Call BusinessOwnerService to save settings, products and subdomain
    const finalizeRes = await BusinessOwnerService.finalizeAiGeneratedWebsite(
      uid,
      businessName,
      {
        theme_color: aiConfig.theme_color,
        banner_title: aiConfig.banner_title,
        banner_description: aiConfig.banner_description,
        banner_image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"
      },
      productsObj
    );

    // Update landingPageCreated in database
    await update(ref(db, `users/${uid}`), {
      landingPageCreated: true,
      subdomain: finalizeRes.subdomain
    });

    return {
      success: true,
      subdomain: finalizeRes.subdomain
    };
  }
}
