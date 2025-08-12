// src/services/ai.js
import axios from 'axios';

const apiKey = process.env.OPENROUTER_API_KEY;
const model  = process.env.OPENROUTER_MODEL;

console.log('OpenRouter API Key:', apiKey ? '✅ Presente' : '❌ Faltante o inválida');

async function getPrediction(prompt) {
  try {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    const data = {
      model, // usa deepseek/deepseek-chat para evitar el 404 de modelos :free
      messages: [
        {
          role: 'system',
          content:
            'Solo continúa el texto del usuario. No respondas como asistente. ' +
            'No expliques nada. Responde solo con la continuación inmediata, breve y coherente del texto. ' +
            'Si el usuario pide lista/tabla/código, continúa con ese formato. ' +
            'Si una palabra está incompleta, complétala y termina la frase.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 40,
      temperature: 0.7
    };

    const response = await axios.post(url, data, { headers });
    const reply = response.data?.choices?.[0]?.message?.content?.trim() ?? '';
    return reply;
  } catch (error) {
    console.error('❌ Error en getPrediction:', error.message);
    if (error.response) {
      console.error('📡 Código de estado:', error.response.status);
      console.error('📩 Respuesta de error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

const iaService = { getPrediction };
export default iaService;
