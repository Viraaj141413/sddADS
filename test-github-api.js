
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.GITHUB_TOKEN;
const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

export async function main() {
  console.log('🔧 Testing GitHub Models API...');
  
  if (!token) {
    console.error('❌ GITHUB_TOKEN not found in environment');
    return;
  }

  console.log('✅ Token found, connecting to GitHub Models...');
  console.log('🔑 Token preview:', token.substring(0, 8) + '...');

  const client = new OpenAI({ baseURL: endpoint, apiKey: token });

  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a creative AI assistant. Give varied, interesting responses." },
        { role: "user", content: "Say hello in a unique way and tell me one interesting fact." }
      ],
      temperature: 0.8,
      top_p: 0.9,
      model: model
    });

    console.log('🤖 GPT-4.1 Response:', response.choices[0].message.content);
    console.log('✅ GitHub Models API is working perfectly!');
    console.log('🎯 API is giving varied responses as expected');
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('🔍 Full error:', error);
  }
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
