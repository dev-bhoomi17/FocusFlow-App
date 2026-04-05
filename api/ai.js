export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, type } = req.body;
    let prompt = "";
    if (type === "journey") {
      prompt = `
    Create a step-by-step learning roadmap for: ${message}
    Rules:
    - Give 5-10 main steps
    - Each step should be SHORT (max 6-8 words)
    - Each step must have 3-4 sub-steps
    - Sub-steps must be very short (action based)

    - Each step MUST include a real, working learning resource link
    - Only use trusted sources:
      YouTube, freeCodeCamp, W3Schools, MDN
    - Do NOT generate fake or broken links

      Return ONLY JSON in this format:
      [
          {
            "title": "Step title",
            "subtasks": ["Subtask 1", "Subtask 2"],
            "resource": "https://example.com"
          },
      ]
`;
    }
    else if (type === "chat") {
      prompt = message;
    }

    else if (type === "summary") {
      prompt = message;
    }
    if (!prompt) {
      prompt = message;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://focus-flow-app-mauve.vercel.app",
        "X-Title": "FocusFlow App"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    console.log("OPENROUTER RAW:", data);

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
