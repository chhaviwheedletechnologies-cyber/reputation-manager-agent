const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Reputation Manager AI Agent server is running"
  });
});

// Main API route
app.post("/analyze-feedback", async (req, res) => {
  try {
    const { customer_name, platform, rating, message } = req.body;

    // Basic validation
    if (!customer_name || !platform || !rating || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        required_fields: ["customer_name", "platform", "rating", "message"]
      });
    }

    if (!N8N_WEBHOOK_URL) {
      return res.status(500).json({
        success: false,
        error: "N8N_WEBHOOK_URL is missing in .env file"
      });
    }

    // Send data to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_name,
        platform,
        rating,
        message
      })
    });

    const rawText = await response.text();

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        error: "Invalid JSON response from n8n",
        raw_response: rawText
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: "n8n webhook returned an error",
        details: result
      });
    }

    return res.json({
      success: true,
      input: {
        customer_name,
        platform,
        rating,
        message
      },
      analysis: result
    });

  } catch (error) {
    console.error("Server Error:", error.message);

    return res.status(500).json({
      success: false,
      error: "Server error",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});