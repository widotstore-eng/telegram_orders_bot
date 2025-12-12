// bot.js
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

// Start command
bot.start((ctx) => {
    ctx.reply(
        "✅ Welcome to Order Bot!\n\n" +
        "Send order details in this format:\n\n" +
        "Name: John Doe\n" +
        "Phone: +201234567890\n" +
        "Address: 123 Main St, Cairo\n" +
        "Product: iPhone 14 Pro\n" +
        "Notes: Any special instructions"
    );
});

// Handle text messages
bot.on("text", async (ctx) => {
    try {
        const text = ctx.message.text;

        // Skip if it's a command
        if (text.startsWith('/')) {
            return;
        }

        console.log("Processing order:", text);

        // Parse the message
        let data = {};
        text.split("\n").forEach((line) => {
            let [key, ...rest] = line.split(":");
            if (key && rest.length > 0) {
                data[key.trim().toLowerCase()] = rest.join(":").trim();
            }
        });

        console.log("Parsed data:", data);

        // Validate required fields
        if (!data.name || !data.phone || !data.address || !data.product) {
            return ctx.reply(
                "❌ Missing required fields!\n\n" +
                "Please use this format:\n\n" +
                "Name: Your Name\n" +
                "Phone: Your Phone\n" +
                "Address: Your Address\n" +
                "Product: Product Name\n" +
                "Notes: Optional notes"
            );
        }

        // Check environment variables
        if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
            console.error("Missing Shopify credentials");
            return ctx.reply("❌ Bot configuration error. Please contact admin.");
        }

        // Create customer object
        const customer = {
            first_name: data.name.split(" ")[0],
            last_name: data.name.split(" ").slice(1).join(" ") || data.name.split(" ")[0],
            phone: data.phone,
            email: `${data.phone.replace(/\+/g, '')}@telegram-order.com`
        };

        // Create order payload
        const orderPayload = {
            order: {
                line_items: [
                    {
                        title: data.product,
                        quantity: 1,
                        price: "0.00" // You can parse price from product if needed
                    }
                ],
                financial_status: "pending",
                billing_address: {
                    name: data.name,
                    address1: data.address,
                    phone: data.phone,
                    country: "EG"
                },
                shipping_address: {
                    name: data.name,
                    address1: data.address,
                    phone: data.phone,
                    country: "EG"
                },
                customer: customer,
                note: data.notes || "",
                tags: "Telegram Order, COD",
                send_receipt: false,
                send_fulfillment_receipt: false
            }
        };

        console.log("Creating Shopify order...");

        // Create order in Shopify
        const response = await axios.post(
            `https://${SHOPIFY_STORE}/admin/api/2024-10/orders.json`,
            orderPayload,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
                    "Content-Type": "application/json",
                },
                timeout: 10000 // 10 second timeout
            }
        );

        const order = response.data.order;
        console.log("Order created:", order.id);

        ctx.reply(
            `✅ Order Created Successfully!\n\n` +
            `Order Number: #${order.name}\n` +
            `Order ID: ${order.id}\n` +
            `Customer: ${data.name}\n` +
            `Product: ${data.product}\n` +
            `Status: ${order.financial_status}`
        );

    } catch (err) {
        console.error("Error processing order:");
        console.error("Error message:", err.message);
        console.error("Error response:", err.response?.data);
        console.error("Error stack:", err.stack);

        let errorMsg = "❌ Error creating order.";

        if (err.response?.data?.errors) {
            errorMsg += "\n\nDetails: " + JSON.stringify(err.response.data.errors);
        } else if (err.message) {
            errorMsg += "\n\nDetails: " + err.message;
        }

        ctx.reply(errorMsg);
    }
});

module.exports = bot;