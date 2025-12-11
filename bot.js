const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(3000, () => console.log("Server running on 3000"));
const { Telegraf } = require("telegraf");
const axios = require("axios");

require("dotenv").config();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

bot.start((ctx) => {
    ctx.reply(
        "Send order details in this format:\n\n" +
        "Name:\nPhone:\nAddress:\nProduct:\nNotes:"
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

        // --- Create customer object ---
        const customer = {
            first_name: data.name.split(" ")[0],
            last_name: data.name.split(" ").slice(1).join(" "),
            phone: data.phone,
            email: `${data.phone}@telegram-order.widot`
        };

        // --- Order payload ---
        const orderPayload = {
            order: {
                line_items: [
                    {
                        title: data.product,
                        quantity: 1
                    }
                ],
                financial_status: "pending", // COD → unpaid
                fulfillment_status: null,
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

        // --- API Call to Shopify ---
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
            `✅ Order Created Successfully!\nOrder Number: #${order.name}\nID: ${order.id}`
        );

    } catch (err) {
        console.error(err.response?.data || err);
        ctx.reply("❌ Error creating order. Check server logs.");
    }
});

bot.launch();
console.log("Bot is running...");
