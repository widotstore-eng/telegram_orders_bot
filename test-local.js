// test-local.js
// Run this locally to test your bot logic before deploying

require('dotenv').config(); // Install: npm install dotenv
const axios = require("axios");

// Test configuration
const TEST_ORDER = {
    name: "Ahmed Hassan",
    phone: "+201012345678",
    address: "10 Tahrir Square, Cairo, Egypt",
    product: "Samsung Galaxy S23",
    notes: "Test order"
};

async function testShopifyConnection() {
    console.log("🔍 Testing Shopify Connection...\n");

    const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

    // Check environment variables
    if (!SHOPIFY_STORE) {
        console.error("❌ SHOPIFY_STORE is not set!");
        return false;
    }
    if (!SHOPIFY_TOKEN) {
        console.error("❌ SHOPIFY_TOKEN is not set!");
        return false;
    }

    console.log("✅ SHOPIFY_STORE:", SHOPIFY_STORE);
    console.log("✅ SHOPIFY_TOKEN:", SHOPIFY_TOKEN.substring(0, 10) + "...");

    // Test API access
    try {
        console.log("\n🔍 Testing Shopify API access...");
        const response = await axios.get(
            `https://${SHOPIFY_STORE}/admin/api/2024-10/shop.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_TOKEN
                }
            }
        );
        console.log("✅ Shopify API is accessible!");
        console.log("   Shop Name:", response.data.shop.name);
        return true;
    } catch (err) {
        console.error("❌ Shopify API Error:");
        console.error("   Status:", err.response?.status);
        console.error("   Message:", err.response?.data || err.message);
        return false;
    }
}

async function testOrderCreation() {
    console.log("\n🔍 Testing Order Creation...\n");

    const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
    const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

    const customer = {
        first_name: TEST_ORDER.name.split(" ")[0],
        last_name: TEST_ORDER.name.split(" ").slice(1).join(" "),
        phone: TEST_ORDER.phone,
        email: `${TEST_ORDER.phone.replace(/\+/g, '')}@telegram-order.com`
    };

    const orderPayload = {
        order: {
            line_items: [
                {
                    title: TEST_ORDER.product,
                    quantity: 1,
                    price: "0.00"
                }
            ],
            financial_status: "pending",
            billing_address: {
                name: TEST_ORDER.name,
                address1: TEST_ORDER.address,
                phone: TEST_ORDER.phone,
                country: "EG"
            },
            shipping_address: {
                name: TEST_ORDER.name,
                address1: TEST_ORDER.address,
                phone: TEST_ORDER.phone,
                country: "EG"
            },
            customer: customer,
            note: TEST_ORDER.notes || "",
            tags: "Telegram Order, COD, Test",
            send_receipt: false,
            send_fulfillment_receipt: false
        }
    };

    console.log("📦 Order Payload:");
    console.log(JSON.stringify(orderPayload, null, 2));

    try {
        console.log("\n🚀 Creating order in Shopify...");
        const response = await axios.post(
            `https://${SHOPIFY_STORE}/admin/api/2024-10/orders.json`,
            orderPayload,
            {
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
                    "Content-Type": "application/json",
                },
                timeout: 10000
            }
        );


        // Shopify returns an array of orders, not a single order
        const order = response.data.orders[0];
        console.log("\n✅ Order Created Successfully!");
        console.log("   Order Number:", order.name);
        console.log("   Order ID:", order.id);
        console.log("   Status:", order.financial_status);
        console.log("   Total:", order.total_price);
        console.log("   View in Shopify: https://" + SHOPIFY_STORE + "/admin/orders/" + order.id);

        return true;
    } catch (err) {
        console.error("\n❌ Order Creation Failed:");
        console.error("   Status:", err.response?.status);
        console.error("   Error:", JSON.stringify(err.response?.data, null, 2));
        console.error("   Message:", err.message);
        return false;
    }
}

async function testTelegramBot() {
    console.log("\n🔍 Testing Telegram Bot...\n");

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!TELEGRAM_BOT_TOKEN) {
        console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
        return false;
    }

    console.log("✅ TELEGRAM_BOT_TOKEN:", TELEGRAM_BOT_TOKEN.substring(0, 10) + "...");

    try {
        const response = await axios.get(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
        );
        console.log("✅ Bot is valid!");
        console.log("   Bot Name:", response.data.result.first_name);
        console.log("   Username:", response.data.result.username);
        return true;
    } catch (err) {
        console.error("❌ Telegram Bot Error:");
        console.error("   Message:", err.response?.data || err.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log("=".repeat(50));
    console.log("🧪 TELEGRAM BOT - LOCAL TESTING");
    console.log("=".repeat(50));

    // Test 1: Telegram Bot
    const botOk = await testTelegramBot();

    // Test 2: Shopify Connection
    const shopifyOk = await testShopifyConnection();

    // Test 3: Order Creation (only if previous tests pass)
    let orderOk = false;
    if (botOk && shopifyOk) {
        orderOk = await testOrderCreation();
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(50));
    console.log("Telegram Bot:", botOk ? "✅ PASS" : "❌ FAIL");
    console.log("Shopify API:", shopifyOk ? "✅ PASS" : "❌ FAIL");
    console.log("Order Creation:", orderOk ? "✅ PASS" : "❌ FAIL");
    console.log("=".repeat(50));

    if (botOk && shopifyOk && orderOk) {
        console.log("\n🎉 All tests passed! Your bot should work.");
        console.log("\n📝 Next steps:");
        console.log("1. Deploy to Vercel");
        console.log("2. Set webhook URL");
        console.log("3. Test with Telegram");
    } else {
        console.log("\n⚠️  Please fix the errors above before deploying.");
    }
}

// Run tests
runAllTests().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});