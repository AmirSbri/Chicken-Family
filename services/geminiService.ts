import { PizzaConfiguration } from "../types";
import { SIZES, CRUSTS, SAUCES, MEATS, VEGGIES } from "../constants";

// Liara API Configuration
const API_BASE_URL = "https://ai.liara.ir/api/694c13b212cdc04b3dc02b24/v1";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiI2OTRjMzkyMDBhMmFlMmMyZWViNzFkNmYiLCJ0eXBlIjoiYWlfa2V5IiwiaWF0IjoxNzY2NjAzMDQwfQ.gIr_YDjFgjGsNhs_MPL0GUz7mGfXii9BuX2VF66VbWM";
const MODEL_NAME = "google/gemini-2.5-flash";

const getIngredientName = (id: string, list: any[]) => list.find(i => i.id === id)?.name || id;

export const generateChefComment = async (config: PizzaConfiguration): Promise<string> => {
  // Translate config to readable string
  const size = getIngredientName(config.size, SIZES);
  const crust = getIngredientName(config.crust, CRUSTS);
  const sauce = getIngredientName(config.sauce, SAUCES);
  const meats = Object.keys(config.meats).map(k => getIngredientName(k, MEATS)).join(', ');
  const veggies = Object.keys(config.veggies).map(k => getIngredientName(k, VEGGIES)).join(', ');

  const prompt = `
    You are a passionate Italian Pizza Chef speaking Persian (Farsi).
    A customer just ordered a pizza with:
    Size: ${size}
    Crust: ${crust}
    Sauce: ${sauce}
    Meats: ${meats || 'None'}
    Veggies: ${veggies || 'None'}

    Write a short, fun, 1-sentence comment complimenting their choice or giving a flavor note. 
    Keep it encouraging. Output ONLY the Persian string.
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "انتخاب عالی! امیدواریم لذت ببرید.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "سفارش شما با موفقیت ثبت شد. نوش جان!";
  }
};

export const interpretVoiceOrder = async (base64Audio: string): Promise<Partial<PizzaConfiguration>> => {
  const prompt = `
    You are a professional pizza order taker. Listen to the Persian audio request and map it to a JSON configuration.
    
    Available Options (IDs):
    Sizes: ${SIZES.map(s => s.id).join(', ')}
    Crusts: ${CRUSTS.map(c => c.id).join(', ')}
    Cuts: normal, square, clean
    Sauces: ${SAUCES.map(s => s.id).join(', ')}
    Bakes: normal, well_done
    Cheeses: mozzarella, gorgonzola, mix
    Meats: ${MEATS.map(m => m.id).join(', ')}
    Veggies: ${VEGGIES.map(v => v.id).join(', ')}

    Rules:
    1. Extract ingredients explicitly mentioned by the user.
    2. If a user asks for "Vegetarian", include a mix of available veggies.
    3. If a user asks for "Pepperoni Pizza", include pepperoni meat.
    4. For meats, veggies, and cheeses, map them to the 'meats', 'veggies', and 'cheeses' objects where the key is the ID and value is 'normal'.
    5. Return a valid JSON object with ONLY the fields the user explicitly mentioned. 
    6. DO NOT fill in defaults for missing information. If the user didn't mention size, do not include 'size' in the JSON.
    7. Output valid JSON only.
  `;

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:audio/wav;base64,${base64Audio}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Voice Interpretation Error:", error);
    throw error;
  }
};