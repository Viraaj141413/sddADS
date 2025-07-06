
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI('AIzaSyAipuvS7H_ZbMpdFgxz-6uHvMYa18eWqoA');

async function testGemini() {
  try {
    console.log('🤖 Testing Gemini 2.5 Flash API...');
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = "Write a creative one-sentence story about a robot learning to code.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✨ Gemini Response:');
    console.log(text);
    console.log('✅ Gemini API is working perfectly!');
    
  } catch (error) {
    console.error('❌ Gemini Error:', error.message);
    console.error('🔍 Full error:', error);
  }
}

testGemini();
