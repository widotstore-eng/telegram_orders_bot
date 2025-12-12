// api/webhook.js
const bot = require("../bot");

module.exports = async (req, res) => {
    // Only handle POST requests
    if (req.method === "POST") {
        try {
            // Vercel automatically parses JSON body
            const body = req.body;

            console.log("Received update:", JSON.stringify(body));

            // Handle the update
            await bot.handleUpdate(body);

            // Return 200 OK immediately
            res.status(200).json({ ok: true });
        } catch (err) {
            console.error("Webhook Error:", err);
            console.error("Error stack:", err.stack);

            // Still return 200 to prevent Telegram from retrying
            res.status(200).json({ ok: true });
        }
        return;
    }

    // GET request (browser test)
    if (req.method === "GET") {
        res.status(200).send("Webhook is running.");
        return;
    }

    // Other methods
    res.status(405).send("Method Not Allowed");
};