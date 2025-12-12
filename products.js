// products.js - Product catalog mapping
// This file maps product codes to SKUs and prices

const PRODUCTS = {
    // Sets - 1499 EGP
    "petroleum-set": {
        name: "Petroleum Set",
        price: "1499.00",
        type: "set",
        sizes: {
            M: "WSPM003",
            L: "WSPL003",
            XL: "WSPX003"
        }
    },
    "black-set": {
        name: "Black Set",
        price: "1499.00",
        type: "set",
        sizes: {
            M: "WSBM003",
            L: "WSBL003",
            XL: "WSBX003"
        }
    },
    "gray-set": {
        name: "Gray Set",
        price: "1499.00",
        type: "set",
        sizes: {
            M: "WSGM003",
            L: "WSGL003",
            XL: "WSGX003"
        }
    },

    // Hoodies - 875 EGP
    "petroleum-hoodie": {
        name: "Petroleum Hoodie",
        price: "875.00",
        type: "hoodie",
        sizes: {
            M: "WHPM001",
            L: "WHPL001",
            XL: "WHPX001"
        }
    },
    "black-hoodie": {
        name: "Black Hoddie", // Note: Shopify has "Hoddie" typo
        price: "875.00",
        type: "hoodie",
        sizes: {
            M: "WHBM001",
            L: "WHBL001",
            XL: "WHBX001"
        }
    },
    "gray-hoodie": {
        name: "Gray Hoodie",
        price: "875.00",
        type: "hoodie",
        sizes: {
            M: "WHGM001",
            L: "WHGL001",
            XL: "WHGX001"
        }
    },

    // Trousers - 675 EGP
    "petroleum-trousers": {
        name: "Petroleum Trousers",
        price: "675.00",
        type: "trousers",
        sizes: {
            M: "WTPM002",
            L: "WTPL002",
            XL: "WTPX002"
        }
    },
    "black-trousers": {
        name: "Black Trousers",
        price: "675.00",
        type: "trousers",
        sizes: {
            M: "WTBM002",
            L: "WTBL002",
            XL: "WTBX002"
        }
    },
    "gray-trousers": {
        name: "Gray Trousers",
        price: "675.00",
        type: "trousers",
        sizes: {
            M: "WTGM002",
            L: "WTGL002",
            XL: "WTGX002"
        }
    }
};

// Helper function to find product by code and size
function getProduct(productCode, size) {
    const product = PRODUCTS[productCode.toLowerCase()];
    if (!product) {
        return null;
    }

    const sizeUpper = size.toUpperCase();
    const sku = product.sizes[sizeUpper];

    if (!sku) {
        return null;
    }

    return {
        title: `${product.name} - Size ${sizeUpper}`,
        quantity: 1,
        price: product.price,
        sku: sku
    };
}

module.exports = { PRODUCTS, getProduct };
