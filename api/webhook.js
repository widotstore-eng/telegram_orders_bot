// api/webhook.js
const bot = require("../bot");

module.exports = async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        return res.status(200).send("OK");
    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
    }
};

// Disable Vercel's body parser
module.exports.config = {
    api: {
        bodyParser: false
    }
};
