// bot.js
const { Telegraf } = require("telegraf");
const axios = require("axios");
const { getProduct } = require("./products");

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
        "Address: 123 Main St\n" +
        "Apartment: Apt 5, Floor 2\n" +
        "City: Cairo\n" +
        "Governorate: Cairo\n" +
        "Products:\n" +
        "- Black Hoodie, L\n" +
        "- Petroleum Trousers, M\n" +
        "WIDOT Order Number: 90\n" +
        "Notes: Any special instructions\n\n" +
        "Available products:\n" +
        "Sets: Petroleum Set, Black Set, Gray Set\n" +
        "Hoodies: Petroleum Hoodie, Black Hoodie, Gray Hoodie\n" +
        "Trousers: Petroleum Trousers, Black Trousers, Gray Trousers\n" +
        "Sizes: M, L, XL"
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
        let inProductsSection = false;
        let products = [];

        text.split("\n").forEach((line) => {
            // Check if we're entering Products section
            if (line.trim().toLowerCase() === "products:") {
                inProductsSection = true;
                return;
            }

            // Parse product lines (starting with -)
            if (inProductsSection && line.trim().startsWith("-")) {
                const productLine = line.trim().substring(1).trim(); // Remove the "-"
                products.push(productLine);
                return;
            }

            // Exit products section if we hit another field
            if (inProductsSection && line.includes(":") && !line.trim().startsWith("-")) {
                inProductsSection = false;
            }

            // Parse regular key:value pairs
            let [key, ...rest] = line.split(":");
            if (key && rest.length > 0 && !line.trim().startsWith("-")) {
                data[key.trim().toLowerCase()] = rest.join(":").trim();
            }
        });

        data.products = products;
        console.log("Parsed data:", data);

        // Validate required fields
        if (!data.name || !data.phone || !data.address || !products.length) {
            return ctx.reply(
                "❌ Missing required fields!\n\n" +
                "Please use this format:\n\n" +
                "Name: Your Name\n" +
                "Phone: Your Phone\n" +
                "Address: Your Address\n" +
                "Apartment: Your Apartment\n" +
                "City: Your City\n" +
                "Governorate: Your Governorate\n" +
                "Products:\n" +
                "- Black Hoodie, L\n" +
                "- Petroleum Trousers, M\n" +
                "WIDOT Order Number: 90\n" +
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
            email: `${data.phone.replace(/\+/g, '')}@telegram-order.com`,
            default_address: {
                first_name: data.name.split(" ")[0],
                last_name: data.name.split(" ").slice(1).join(" ") || data.name.split(" ")[0],
                phone: data.phone,
                address1: data.address,
                address2: data.apartment || "",
                city: data.city,
                province: data.governorate,
                country: "EG",
                country_code: "EG"
            }
        };

        // Parse and validate products
        const line_items = [];
        const invalidProducts = [];

        for (const productLine of data.products) {
            // Parse "Product Name, Size" format
            const parts = productLine.split(",").map(p => p.trim());
            if (parts.length !== 2) {
                invalidProducts.push(productLine);
                continue;
            }

            const [productName, size] = parts;

            // Convert product name to product code (e.g., "Black Hoodie" -> "black-hoodie")
            const productCode = productName.toLowerCase().replace(/ /g, "-");

            // Look up product
            const product = getProduct(productCode, size);
            if (!product) {
                invalidProducts.push(productLine);
                continue;
            }

            line_items.push(product);
        }

        // If any invalid products, notify user
        if (invalidProducts.length > 0) {
            return ctx.reply(
                `❌ Invalid products:\n${invalidProducts.join("\n")}\n\n` +
                "Please check product names and sizes.\n" +
                "Available: Petroleum/Black/Gray + Set/Hoodie/Trousers\n" +
                "Sizes: M, L, XL"
            );
        }

        // Create order payload
        const orderPayload = {
            order: {
                line_items: line_items,
                financial_status: "pending",
                billing_address: {
                    name: data.name,
                    address1: data.address,
                    phone: data.phone,
                    country: "EG"
                },
                shipping_address: {
                    first_name: data.name.split(" ")[0],
                    last_name: data.name.split(" ").slice(1).join(" ") || data.name.split(" ")[0],
                    address1: data.address,
                    address2: data.apartment || "",
                    city: data.city,
                    province: data.governorate,
                    phone: data.phone,
                    country: "EG",
                    country_code: "EG"
                },
                customer: customer,
                note: (data["widot order number"] ? `ORDER_${data["widot order number"]}\n\n` : "") + (data.notes || ""),
                tags: "Telegram Order, COD" + (data["widot order number"] ? `, ORDER_${data["widot order number"]}` : ""),
                send_receipt: false,
                send_fulfillment_receipt: false
            }
        };


        console.log("Creating Shopify order...");
        console.log("Request URL:", `https://${SHOPIFY_STORE}/admin/api/2024-10/orders.json`);

        // Create order in Shopify
        const response = await axios.post(
            `https://${SHOPIFY_STORE}/admin/api/2024-10/orders.json`,
            orderPayload,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
                maxRedirects: 5
            }
        );

        console.log("Response Status:", response.status, response.statusText);
        console.log("Response Keys:", Object.keys(response.data));

        // Check if order was created (singular) or existing orders returned (plural)
        if (response.data.order) {
            const order = response.data.order;
            console.log("✅ New order created:", order.id);

            ctx.reply(
                `✅ Order Created Successfully!\n\n` +
                `Order Number: #${order.name}\n` +
                `Order ID: ${order.id}\n` +
                `Customer: ${data.name}\n` +
                `Product: ${data.product}\n` +
                `Status: ${order.financial_status}`
            );
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
            console.error("⚠️ Got existing orders array instead of creating new order!");
            console.error("This indicates a POST-to-GET redirect issue.");
            ctx.reply("❌ Error: Could not create order. Please contact admin.");
        } else {
            console.error("❌ Unexpected response structure:", response.data);
            ctx.reply("❌ Error creating order. Please contact admin.");
        }

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