import { GoogleGenerativeAI } from '@google/generative-ai';
import readline from 'readline';

// Initialize the model
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'your-api-key-here');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Function to interact
async function chat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Gemini CLI - Type your message (type "exit" to quit):');

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        rl.close();
        return;
      }

      try {
        const result = await model.generateContent(input);
        const response = await result.response;
        const text = response.text();
        console.log('Gemini:', text);
      } catch (error) {
        console.error('Error:', error.message);
      }

      askQuestion();
    });
  };

  askQuestion();
}

chat();
