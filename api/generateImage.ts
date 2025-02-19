import { NextApiRequest, NextApiResponse } from 'next';

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2";
  const headers = {
    Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
    "Content-Type": "application/json",
  };

  const requestBody = JSON.stringify({ inputs: prompt });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorJson = await response.json();
      return res.status(response.status).json({ error: errorJson.error || 'Error generating image' });
    }

    const imageBlob = await response.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

