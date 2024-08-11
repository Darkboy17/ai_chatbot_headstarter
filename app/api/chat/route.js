import { NextResponse } from "next/server"; // Import NextResponse from Next.js for handling responses
import { GoogleAuth } from "google-auth-library";

const { VertexAI } = require("@google-cloud/vertexai");

// Parse the credentials from the environment variable

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

// Create a new GoogleAuth instance with the credentials
const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({
  project: "eminent-will-432005-a5",
  location: "us-central1",
  auth: auth,
});
const model = "gemini-1.5-flash-001";

const textsi_1 = {
  text: `I am developing a customer support chatbot for Headstarter AI, a platform specialized in conducting AI-powered interviews for Software Engineering positions. The bot should be capable of handling a wide range of queries including but not limited to scheduling interviews, explaining AI features, addressing technical issues, and providing resources for interview preparation. Please generate a series of conversational responses that reflect a knowledgeable and helpful demeanor. Each response should be tailored to address common inquiries and effectively guide users towards resolving their issues or finding the information they seek. Don't answer question that are out of context and stick to what you are told to do.\"

  This prompt sets the stage for the GPT model by specifying the context (a customer support bot for Headstarter AI), the domain (AI-powered interviews for SWE jobs), and the types of interactions the bot should be capable of managing. It also emphasizes the importance of the bot\'s demeanor—knowledgeable and helpful—and its role in guiding users effectively.`,
};

// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  systemInstruction: {
    parts: [textsi_1],
  },
});

export async function POST(req) {
  // Assuming the request body contains the initial user message
  const contents = await req.json();

  console.log('contents:', contents);
  
  // Find the last user message
  const lastUserMessage = contents.reverse().find(item => item.role === 'user');

  if (!lastUserMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const reqBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: lastUserMessage.content }]
      }
    ],
  };

  const streamingResp = await generativeModel.generateContentStream(reqBody);

  // Create a new ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      for await (const item of streamingResp.stream) {
        const chunk = item.candidates[0].content.parts[0].text;
        // Encode the chunk and enqueue it
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });

  // Return a streaming response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });

    
}