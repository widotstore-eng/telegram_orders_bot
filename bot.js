// bot.js
const { Telegraf, Markup, session } = require("telegraf");
const axios = require("axios");
const { getProduct, UI_OPTIONS } = require("./products");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.use(session());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

// Start command
bot.start((ctx) => {
    ctx.session = null; // Clear session on start
    ctx.reply(
        "✅ Welcome to Order Bot!\n\n" +
        "First, please send your contact details in this format:\n\n" +
        "Name: John Doe\n" +
        "Phone: +201234567890\n" +
        "Address: 123 Main St\n" +
        "Apartment: Apt 5, Floor 2\n" +
        "City: Cairo\n" +
        "Governorate: Cairo\n" +
        "WIDOT Order Number: 90\n" +
        "Notes: Any special instructions\n\n" +
        "👇 After you send this, I'll help you pick your products!"
    );
});

// Interactive Flow Handlers
// ---------------------------------------------------------

// 1. Select Type
function askProductType(ctx) {
    const buttons = UI_OPTIONS.types.map(type =>
        Markup.button.callback(type, `type:${type}`)
    );
    // Add rows of 2 buttons
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    ctx.reply("📦 What would you like to add?", Markup.inlineKeyboard(rows));
}

bot.action(/^type:(.+)/, async (ctx) => {
    const type = ctx.match[1];
    ctx.session.tempProduct = { type: type };
    await ctx.answerCbQuery();

    const buttons = UI_OPTIONS.colors.map(color =>
        Markup.button.callback(color, `color:${color}`)
    );
    // Add rows of 2
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
    }

    await ctx.editMessageText(
        `Selected: ${type}\n🎨 Now choose a color:`,
        Markup.inlineKeyboard(rows)
    );
});

// 2. Select Color
bot.action(/^color:(.+)/, async (ctx) => {
    const color = ctx.match[1];
    if (!ctx.session.tempProduct) return ctx.reply("❌ Session expired. Please start over.");

    ctx.session.tempProduct.color = color;
    await ctx.answerCbQuery();

    const buttons = UI_OPTIONS.sizes.map(size =>
        Markup.button.callback(size, `size:${size}`)
    );

    await ctx.editMessageText(
        `Selected: ${ctx.session.tempProduct.type} - ${color}\n📏 Pick a size:`,
        Markup.inlineKeyboard([buttons])
    );
});

// 3. Select Size & Add to Cart
bot.action(/^size:(.+)/, async (ctx) => {
    const size = ctx.match[1];
    if (!ctx.session.tempProduct) return ctx.reply("❌ Session expired. Please start over.");

    const { type, color } = ctx.session.tempProduct;
    await ctx.answerCbQuery();

    // Look up product
    // Construct key: petroleum-set
    const productKey = `${color.toLowerCase()}-${type.toLowerCase()}`;
    const product = getProduct(productKey, size);

    if (!product) {
        return ctx.reply("❌ Sorry, this combination is not available. Try another.", Markup.inlineKeyboard([
            Markup.button.callback("🔙 Back to Types", "add_more")
        ]));
    }

    // Add to cart
    if (!ctx.session.cart) ctx.session.cart = [];
    ctx.session.cart.push(product);
    ctx.session.tempProduct = null;

    // Show Summary
    showCartSummary(ctx, true);
});

function showCartSummary(ctx, isUpdate = false) {
    let summary = "🛒 <b>Your Cart:</b>\n\n";
    let total = 0;

    ctx.session.cart.forEach((item, index) => {
        summary += `${index + 1}. ${item.title} - ${item.price} EGP\n`;
        total += parseFloat(item.price);
    });

    summary += `\n<b>Total: ${total.toFixed(2)} EGP</b>`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback("➕ Add Another Product", "add_more")],
        [Markup.button.callback("✅ Complete Order", "finish_order")]
    ]);

    if (isUpdate) {
        ctx.editMessageText(summary, { parse_mode: 'HTML', ...buttons });
    } else {
        ctx.replyWithHTML(summary, buttons);
    }
}

// 4. Add More Loop
bot.action("add_more", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage(); // Clean up old summary
    askProductType(ctx);
});

// 5. Finish Order
bot.action("finish_order", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("🚀 creating order...");

    if (!ctx.session.orderData || !ctx.session.cart || ctx.session.cart.length === 0) {
        return ctx.reply("❌ Cart is empty or session expired! Please start over.");
    }

    await createShopifyOrder(ctx, ctx.session.orderData, ctx.session.cart);

    // Clear session
    ctx.session = null;
});

// Main Text Handler (Entry Point)
bot.on("text", async (ctx) => {
    try {
        const text = ctx.message.text;

        // Skip if command
        if (text.startsWith('/')) return;

        console.log("Processing text:", text);

        // Check active session (if user is typing manual info)
        // For now, assume text is always Contact Info block unless we add manual typing steps later.

        // Parse Contact Data
        let data = {};
        let products = [];
        let inProducts = false;

        text.split("\n").forEach((line) => {
            if (line.trim().toLowerCase() === "products:") {
                inProducts = true; return;
            }
            if (inProducts && line.trim().startsWith("-")) {
                products.push(line.trim().substring(1).trim());
                return;
            }
            if (inProducts && line.includes(":")) inProducts = false;

            let [key, ...rest] = line.split(":");
            if (key && rest.length > 0 && !line.trim().startsWith("-")) {
                data[key.trim().toLowerCase()] = rest.join(":").trim();
            }
        });

        // Validate Basic Info
        if (!data.name || !data.phone || !data.address) {
            return ctx.reply(
                "❌ Missing contact info!\n\n" +
                "Please send your Name, Phone, and Address first:\n\n" +
                "Name: John Doe\n" +
                "Phone: +201234567890\n" +
                "Address: 123 Main St\n..."
            );
        }

        // Initialize Session
        ctx.session = {
            orderData: data,
            cart: []
        };

        // IF user provided "Products:" list manually -> Expert Mode
        if (products.length > 0) {
            // ... legacy interactive parsing ...
            const line_items = [];
            for (const p of products) {
                const parts = p.split(",").map(part => part.trim());
                if (parts.length === 2) {
                    const code = parts[0].toLowerCase().replace(/ /g, "-");
                    const prod = getProduct(code, parts[1]);
                    if (prod) line_items.push(prod);
                }
            }

            if (line_items.length > 0) {
                // Create order immediately
                await createShopifyOrder(ctx, data, line_items);
            } else {
                ctx.reply("⚠️ Couldn't parse products from text. Let's select them manually.");
                askProductType(ctx);
            }
            return;
        }

        // ELSE -> Interactive Mode
        ctx.reply(
            `✅ Contact info saved for ${data.name}!\n\n` +
            `Now let's pick your products.`
        );
        askProductType(ctx);

    } catch (err) {
        console.error("Handler error:", err);
        ctx.reply("❌ An error occurred.");
    }
});


// Helper: Create Shopify Order
async function createShopifyOrder(ctx, data, lineItems) {
    // Check Config
    if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
        return ctx.reply("❌ Bot configuration error. Missing Credentials.");
    }

    // Customer Payload
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

    // Order Payload
    const orderPayload = {
        order: {
            line_items: lineItems,
            financial_status: "pending",
            billing_address: {
                name: data.name,
                address1: data.address,
                phone: data.phone,
                country: "EG"
            },
            shipping_address: customer.default_address,
            customer: customer,
            note: (data["widot order number"] ? `ORDER_${data["widot order number"]}\n\n` : "") + (data.notes || ""),
            tags: "Telegram Order, COD" + (data["widot order number"] ? `, ORDER_${data["widot order number"]}` : ""),
            send_receipt: false,
            send_fulfillment_receipt: false
        }
    };

    try {
        console.log("🚀 Creating Shopify Order...");
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

        if (response.data.order) {
            const order = response.data.order;
            ctx.reply(
                `🎉 <b>Order Created Successfully!</b>\n\n` +
                `📦 <b>Order #${order.name}</b>\n` +
                `🆔 ID: <code>${order.id}</code>\n` +
                `👤 Customer: ${data.name}\n` +
                `💰 Total: ${order.total_price} EGP\n\n` +
                `Thank you!`,
                { parse_mode: 'HTML' }
            );
        } else {
            ctx.reply("❌ Could not verify order creation. Please check Admin.");
        }

    } catch (err) {
        console.error("Shopify Error:", err.response?.data || err.message);
        ctx.reply(`❌ Error creating order: ${err.message}`);
    }
}

module.exports = bot;