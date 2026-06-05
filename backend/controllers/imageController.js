import asyncHandler from "../middleware/asyncHandler.js";

export const generateImage = asyncHandler(async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400);
    throw new Error("Prompt is required");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // If no key is provided, return a mock response for demonstration
    // Since the prompt instructs to implement the architecture and the user 
    // might not have a real API key yet.
    return res.json({
      success: true,
      data: [
        {
          url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=512&q=80",
          mocked: true,
          message: "Mock image returned because OPENAI_API_KEY is not set in backend .env"
        }
      ]
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-2", // Or dall-e-3
        prompt: prompt,
        n: 1,
        size: "512x512"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      res.status(response.status);
      throw new Error(data.error?.message || "Failed to generate image from external API");
    }

    res.json({
      success: true,
      data: data.data
    });

  } catch (error) {
    res.status(500);
    throw new Error(error.message || "Failed to generate image");
  }
});
