import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize the Gemini API client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables. Fallbacks will be active.")
    return null
  }
  return new GoogleGenerativeAI(apiKey)
}

// Enforce category types
export type Category = 'Food' | 'Entertainment' | 'Activities' | 'Shopping' | 'Other'

export interface TaggedOption {
  text: string
  tags: string[]
}

export interface ClassificationResult {
  category: Category
  options: TaggedOption[]
}

export interface ReinforcementResult {
  reasons: string[]
  message: string
}

// Timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
  ])
}

/**
 * Task 3.2: Classify a list of options and extract descriptive tags.
 */
export async function classifyOptions(options: string[]): Promise<ClassificationResult> {
  const genAI = getGenAI()
  if (!genAI) {
    return getFallbackClassification(options)
  }

  const prompt = `
You are the backend classification engine for MunchPick, an AI-powered decision companion.
Analyze the following list of options and:
1. Detect the overall single category for this list. Supported categories: "Food", "Entertainment", "Activities", "Shopping", "Other".
2. For each option, extract 2-4 lowercase descriptive tags (e.g. food tags like "healthy", "sweet", "japanese"; entertainment tags like "action", "comedy", "relaxing").

List of options to process:
${options.map((opt, i) => `- [${i}]: "${opt}"`).join('\n')}

Output must follow this JSON schema:
{
  "category": "Food" | "Entertainment" | "Activities" | "Shopping" | "Other",
  "options": [
    {
      "text": "the exact option text",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ]
}
`

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })

    // 4-second timeout limit for classification
    const response = await withTimeout(
      model.generateContent(prompt),
      4000,
      'Gemini classification timed out'
    )
    
    const text = response.response.text()
    const parsed = JSON.parse(text) as ClassificationResult

    // Validate category
    const validCategories: Category[] = ['Food', 'Entertainment', 'Activities', 'Shopping', 'Other']
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'Other'
    }

    return parsed
  } catch (error) {
    console.error("Gemini classification failed, running fallback pipeline:", error)
    return getFallbackClassification(options)
  }
}

/**
 * Task 3.5: Generate positive reinforcement for the selected option.
 */
export async function generateReinforcement(
  selectedOption: string, 
  category: Category
): Promise<ReinforcementResult> {
  const genAI = getGenAI()
  if (!genAI) {
    return getFallbackReinforcement(selectedOption, category)
  }

  const prompt = `
You are Munch 🍀, a warm, positive, and playful AI mascot guiding a user through their choice.
The user has just had the option "${selectedOption}" selected in the "${category}" category.
Your job is to make them feel 100% confident and happy about this choice.

Generate positive reinforcement rules:
1. Return exactly 3 to 5 bullet points (reasons) explaining why this is a great selection.
2. Be specific to the option text. Do NOT be generic.
3. Write one brief, highly encouraging closing sentence (message) with a matching emoji.
4. ABSOLUTE RULES:
   - Do NOT compare this option to other options.
   - Do NOT mention any potential drawbacks, costs, or caveats.
   - Do NOT suggest any alternatives.
   - Keep the tone supportive, direct, and joyful.

Output must follow this JSON schema:
{
  "reasons": ["reason 1", "reason 2", "reason 3"],
  "message": "encouraging closing statement!"
}
`

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })

    // 4-second timeout limit for reinforcement
    const response = await withTimeout(
      model.generateContent(prompt),
      4000,
      'Gemini reinforcement generation timed out'
    )

    const text = response.response.text()
    return JSON.parse(text) as ReinforcementResult
  } catch (error) {
    console.error("Gemini reinforcement generation failed, running fallback pipeline:", error)
    return getFallbackReinforcement(selectedOption, category)
  }
}

// Fallback logic for Classification
function getFallbackClassification(options: string[]): ClassificationResult {
  // Simple regex-based category detection as fallback
  const textStr = options.join(' ').toLowerCase()
  let category: Category = 'Other'
  if (/pizza|sushi|pasta|burger|food|eat|dinner|lunch|breakfast|restaurant/i.test(textStr)) {
    category = 'Food'
  } else if (/movie|film|netflix|show|watch|game|youtube|music|book/i.test(textStr)) {
    category = 'Entertainment'
  } else if (/run|gym|work|study|code|read|sleep|clean/i.test(textStr)) {
    category = 'Activities'
  } else if (/buy|shop|clothes|shoes|amazon|gadget/i.test(textStr)) {
    category = 'Shopping'
  }

  // Simple tag extraction based on space splits
  const parsedOptions = options.map(opt => {
    const words = opt.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['with', 'from', 'your', 'that', 'this'].includes(w))
    return {
      text: opt,
      tags: words.slice(0, 3)
    }
  })

  return {
    category,
    options: parsedOptions
  }
}

// Fallback logic for Reinforcement
function getFallbackReinforcement(selectedOption: string, category: Category): ReinforcementResult {
  const genericReasons: Record<Category, { reasons: string[]; message: string }> = {
    Food: {
      reasons: [
        `It satisfies your hunger and is exactly what you need right now.`,
        `It provides excellent nutrition/flavor to keep you happy.`,
        `It is a delicious pick that requires zero overthinking.`
      ],
      message: `Tuck in and enjoy a great choice! 🍕`
    },
    Entertainment: {
      reasons: [
        `It offers perfect relaxation to help you unwind and recharge.`,
        `It is highly rated and fits your leisure mood.`,
        `It makes the most of your free time.`
      ],
      message: `Sit back and enjoy the pick! 🍿`
    },
    Activities: {
      reasons: [
        `It gets you moving and builds excellent productivity momentum.`,
        `It reduces stress and makes you feel accomplished afterwards.`,
        `It is a positive choice for your daily wellness goals.`
      ],
      message: `Action cures overthinking. Go get 'em! 🏃‍♂️`
    },
    Shopping: {
      reasons: [
        `It is a practical choice that adds utility to your daily life.`,
        `It represents great value and fills a clear need.`,
        `It is a durable, satisfying purchase you will love using.`
      ],
      message: `A great addition to your day! 🛍️`
    },
    Other: {
      reasons: [
        `It reduces decision fatigue by giving you a clear, positive path.`,
        `It lets you proceed without second-guessing yourself.`,
        `It is the right choice for your current pace and context.`
      ],
      message: `Trust your gut — this is going to be great! 🍀`
    }
  }

  return genericReasons[category] || genericReasons.Other
}
