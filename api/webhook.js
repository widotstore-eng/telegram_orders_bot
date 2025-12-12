// api/webhook.js
const bot = require("../bot");

// Because Vercel uses raw body by default for Node serverless
module.exports = async (req, res) => {
    // Telegram sends POST → handle update
    if (req.method === "POST") {
        try {
            // Get raw body as JSON
            let body = req.body;

            // If body is empty (rare), parse raw buffer
            if (!body) {
                const chunks = [];
                for await (const chunk of req) chunks.push(chunk);
                body = JSON.parse(Buffer.concat(chunks).toString());
            }

            await bot.handleUpdate(body);
            return res.status(200).send("OK");
        } catch (err) {
            console.error("Webhook Error:", err);
            return res.status(500).send("Error");
        }
    }

    // GET request (browser test)
    if (req.method === "GET") {
        return res.status(200).send("Webhook is running.");
    }

    // Other methods (PUT/DELETE)
    return res.status(405).send("Method Not Allowed");
};

// Disable Vercel Body Parser
module.exports.config = {
    api: {
        bodyParser: false
    }
};
