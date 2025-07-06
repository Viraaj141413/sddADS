
import OpenAI from "openai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOpenAI() {
  try {
    console.log('🤖 Testing OpenAI GPT-4.1...');
    
    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user", 
          content: "Write a one-sentence bedtime story about a unicorn."
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    console.log('✨ OpenAI Response:');
    console.log(response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOpenAI();
