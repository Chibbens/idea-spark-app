// This is a Netlify Serverless Function.
// It runs securely on Netlify's servers and hides your API key.

// The 'fetch' module is needed for making HTTP requests in a Node.js environment.
// Netlify Functions support this.
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);
    
    // Check if a prompt was provided.
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No prompt provided.' }),
      };
    }

    // This is the SECURE way. It reads the key from your Netlify settings.
    const apiKey = process.env.GOOGLE_API_KEY;

    // This check ensures the environment variable is set in Netlify.
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key is not configured on the server. Please set the GOOGLE_API_KEY environment variable in your Netlify site settings.'})
        }
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const fullPrompt = `Generate a numbered list of 5 creative and unique ideas for the following topic: "${prompt}". Return only the numbered list, without any introductory text.`;

    const payload = {
      contents: [{
        parts: [{ text: fullPrompt }],
      }],
    };

    // Call the Google AI API.
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("Google AI API Error:", errorText);
        return { statusCode: apiResponse.status, body: JSON.stringify({ error: `Google AI API error: ${errorText}` }) };
    }

    const data = await apiResponse.json();
    
    // Process the response and send it back to the user's app.
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        const ideas = text.split('\n').filter(idea => idea.trim() !== '');

        return {
            statusCode: 200,
            body: JSON.stringify({ ideas: ideas }),
        };
    } else {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             return { statusCode: 400, body: JSON.stringify({ error: `Request blocked by safety settings: ${data.promptFeedback.blockReason}` }) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: 'Invalid response structure from API.' }) };
    }

  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal server error occurred.' }),
    };
  }
};
