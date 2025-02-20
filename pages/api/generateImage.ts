import { NextApiRequest, NextApiResponse } from "next";

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
console.log("HUGGING_FACE_API_KEY:", HUGGING_FACE_API_KEY ? "Loaded" : "Not found");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2";
  const headers = {
    Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      return res.status(response.status).json({ error: errorJson?.error || "Error generating image" });
    }

    // Получаем бинарные данные изображения
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // Отправляем base64-изображение
    res.status(200).json({ image: `data:image/png;base64,${imageBase64}` });
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
