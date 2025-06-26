// Located at: /netlify/functions/sendFeedback.js

const fetch = require('node-fetch');

exports.handler = async function(event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Securely get environment variables
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('Bot token or Chat ID not configured in environment variables.');
        return { statusCode: 500, body: 'Server configuration error.' };
    }

    try {
        const { message, rating } = JSON.parse(event.body);

        // --- Data Validation ---
        if (!message || typeof message !== 'string' || message.length < 5) {
            return { statusCode: 400, body: 'Invalid or too short message.' };
        }
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return { statusCode: 400, body: 'Invalid rating.' };
        }

        // --- Get additional context ---
        const userAgent = event.headers['user-agent'] || 'Not available';

        // --- Format the message for Telegram ---
        const ratingStars = '⭐'.repeat(rating) + '✩'.repeat(5 - rating);
        
        const text = [
            `📝 *New Feedback Received!*`,
            `--------------------------------------`,
            `*Rating:* ${ratingStars} (${rating}/5)`,
            `*Message:*`,
            `${message}`, // User message is here
            `--------------------------------------`,
            `*From:* \`${userAgent}\``
        ].join('\n');

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown' // Use Markdown for bold/italic formatting
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Telegram API Error:', errorData);
            return { statusCode: 502, body: 'Failed to send message via Telegram.' };
        }

        return { statusCode: 200, body: 'Success' };

    } catch (err) {
        console.error('Server error:', err);
        return { statusCode: 500, body: 'An internal error occurred.' };
    }
};

