// bot.js
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

bot.start((ctx) => {
    ctx.reply(
        "Send order details:\n\nName:\nPhone:\nAddress:\nProduct:\nNotes:"
    );
});

bot.on("text", async (ctx) => {
    try {
        const text = ctx.message.text;

        let data = {};
        text.split("\n").forEach((line) => {
            let [key, ...rest] = line.split(":");
            if (key && rest)
                data[key.trim().toLowerCase()] = rest.join(":").trim();
        });

        if (!data.name || !data.phone || !data.address || !data.product) {
            return ctx.reply("❌ Missing fields! Please follow the format.");
        }

        const customer = {
            first_name: data.name.split(" ")[0],
            last_name: data.name.split(" ").slice(1).join(" "),
            phone: data.phone,
            email: `${data.phone}@telegram-order.widot`
        };

        const orderPayload = {
            order: {
                line_items: [
                    { title: data.product, quantity: 1 }
                ],
                financial_status: "pending",
                billing_address: {
                    name: data.name,
                    address1: data.address,
                    phone: data.phone
                },
                shipping_address: {
                    name: data.name,
                    address1: data.address,
                    phone: data.phone
                },
                customer: customer,
                note: data.notes || "",
                tags: "Telegram Order, COD"
            }
        };

        const response = await axios.post(
            `https://${SHOPIFY_STORE}/admin/api/2024-10/orders.json`,
            orderPayload,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
                    "Content-Type": "application/json",
                },
            }
        );

        const order = response.data.order;
        ctx.reply(
            `✅ Order Created!\nOrder Number: #${order.name}\nID: ${order.id}`
        );

    } catch (err) {
        console.error(err.response?.data || err);
        ctx.reply("❌ Error creating order.");
    }
});

module.exports = bot;
