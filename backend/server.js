const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authenticateToken = require("./authMiddleware");
const authorizeRole = require("./roleMiddleware");
const multer = require("multer");

const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Create the folder for uploaded food images
const foodImagesDir = path.join(__dirname, "uploads", "foods");

fs.mkdirSync(foodImagesDir, { recursive: true });

// Configure image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, foodImagesDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = `food-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

        cb(null, uniqueName);
    }
});

// Allow only supported image formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, PNG, and WebP images are allowed."));
    }
};

// Configure Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Make uploaded images accessible through the backend
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 3000;
/* Admin Dashboard API */
app.get(
"/api/admin/dashboard",
authenticateToken,
authorizeRole("admin"),
(req, res) => {
res.status(200).json({
success: true,
message: "Welcome to the Smart Canteen Admin Dashboard!",
admin: {
userId: req.user.userId,
role: req.user.role
}
});
}
);
/* Admin Dashboard Statistics API */
app.get(
"/api/admin/stats",
authenticateToken,
authorizeRole("admin"),
(req, res) => {
const sql = `
SELECT
(SELECT COUNT(*) FROM food_items)
AS totalFoodItems,


            (SELECT COUNT(*)
             FROM orders)
                AS totalOrders,

            (SELECT COALESCE(SUM(total_amount), 0)
             FROM orders
             WHERE order_status = 'COMPLETED')
                AS totalSales,

            (SELECT COUNT(*)
             FROM food_items
             WHERE stock_quantity <= 10)
                AS lowStockItems
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Admin statistics error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to fetch dashboard statistics."
            });
        }

        return res.status(200).json({
            success: true,
            stats: results[0]
        });
    });
}


);

/* ============================================
PHASE 9: ADMIN VIEW ALL ORDERS API
============================================ */

app.get(
"/api/admin/orders",
authenticateToken,
authorizeRole("admin"),
(req, res) => {
const sql = `             SELECT
                o.order_id,
                o.user_id,
                u.name AS customer_name,
                u.email AS customer_email,
                o.total_amount,
                o.order_status,
                o.created_at
            FROM orders o
            INNER JOIN users u
                ON o.user_id = u.user_id
            ORDER BY o.created_at DESC
        `;


    db.query(sql, (err, results) => {
        if (err) {
            console.error(
                "Admin orders error:",
                err.message
            );

            return res.status(500).json({
                success: false,
                message: "Unable to fetch customer orders."
            });
        }

        return res.status(200).json({
            success: true,
            totalOrders: results.length,
            orders: results
        });
    });
}


);

// Update customer order status and create a notification (Admin only)
app.put(
"/api/admin/orders/:orderId/status",
authenticateToken,
authorizeRole("admin"),
(req, res) => {
const orderId = req.params.orderId;
const { order_status } = req.body;

    const allowedStatuses = [
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED"
    ];

    // Validate the requested status
    if (!allowedStatuses.includes(order_status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid order status."
        });
    }

    // Messages shown to the student
    const notificationMessages = {
        PREPARING: "Your order is being prepared.",
        READY: "Your order is ready for collection!",
        COMPLETED: "Your order has been completed.",
        CANCELLED: "Your order has been cancelled."
    };

    // Update the order status
    const updateSql = `
        UPDATE orders
        SET order_status = ?
        WHERE order_id = ?
    `;

    db.query(updateSql, [order_status, orderId], (err, result) => {
        if (err) {
            console.error("Update order status error:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to update order status."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        // Find the student who owns this order
        const findUserSql = `
            SELECT user_id
            FROM orders
            WHERE order_id = ?
        `;

        db.query(findUserSql, [orderId], (userErr, userResults) => {
            if (userErr) {
                console.error("Find order owner error:", userErr.message);

                return res.status(500).json({
                    success: false,
                    message: "Order status updated, but the notification could not be created."
                });
            }

            if (userResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Order owner not found."
                });
            }

            const userId = userResults[0].user_id;
            const message = notificationMessages[order_status];

            // Save the notification for the student
            const notificationSql = `
                INSERT INTO notifications (user_id, order_id, message)
                VALUES (?, ?, ?)
            `;

            db.query(
                notificationSql,
                [userId, orderId, message],
                (notificationErr, notificationResult) => {
                    if (notificationErr) {
                        console.error(
                            "Create notification error:",
                            notificationErr.message
                        );

                        return res.status(500).json({
                            success: false,
                            message: "Order status updated, but the notification could not be created."
                        });
                    }

                    return res.status(200).json({
                        success: true,
                        message: "Order status updated and notification created successfully.",
                        orderId: Number(orderId),
                        order_status: order_status,
                        notificationId: notificationResult.insertId
                    });
                }
            );
        });
    });
}


);

// Add a food item with an optional image (Admin only)
app.post(
    "/api/admin/foods",
    authenticateToken,
    authorizeRole("admin"),
    upload.single("food_image"),
    (req, res) => {
        const {
            food_name,
            description,
            price,
            category_id,
            image_url,
            is_available,
            stock_quantity
        } = req.body;

        // Validate required fields
        if (
            !food_name ||
            price === undefined ||
            price === null ||
            category_id === undefined ||
            category_id === null ||
            stock_quantity === undefined ||
            stock_quantity === null
        ) {
            return res.status(400).json({
                success: false,
                message: "Food name, price, category, and stock quantity are required."
            });
        }

        // Validate field values
        if (
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0 ||
            !Number.isInteger(Number(stock_quantity)) ||
            Number(stock_quantity) < 0 ||
            !Number.isInteger(Number(category_id)) ||
            Number(category_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid price, category ID, and non-negative stock quantity."
            });
        }

        if (!food_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Food name cannot be empty."
            });
        }

        // Use the uploaded image path when an image is selected.
        // Otherwise, preserve support for an image URL.
        const savedImageUrl = req.file
            ? `/uploads/foods/${req.file.filename}`
            : (image_url || null);

        const sql = `
            INSERT INTO food_items
            (
                food_name,
                description,
                price,
                category_id,
                image_url,
                is_available,
                stock_quantity
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            food_name.trim(),
            description || null,
            Number(price),
            Number(category_id),
            savedImageUrl,
            is_available === undefined
                ? true
                : String(is_available) === "true",
            Number(stock_quantity)
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(
                    "Failed to add food item:",
                    err.message
                );

                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        success: false,
                        message: "The selected category does not exist."
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Failed to add food item."
                });
            }

            return res.status(201).json({
                success: true,
                message: "Food item added successfully.",
                food_id: result.insertId,
                image_url: savedImageUrl
            });
        });
    }
);

// Update a food item and optionally replace its image (Admin only)
app.put(
    "/api/admin/foods/:id",
    authenticateToken,
    authorizeRole("admin"),
    upload.single("food_image"),
    (req, res) => {
        const foodId = req.params.id;

        const {
            food_name,
            description,
            price,
            category_id,
            image_url,
            is_available,
            stock_quantity
        } = req.body;

        // Validate food ID
        if (
            !Number.isInteger(Number(foodId)) ||
            Number(foodId) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid food item ID."
            });
        }

        // Validate required fields
        if (
            !food_name ||
            price === undefined ||
            price === null ||
            category_id === undefined ||
            category_id === null ||
            stock_quantity === undefined ||
            stock_quantity === null ||
            is_available === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Food name, price, category, availability, and stock quantity are required."
            });
        }

        // Validate field values
        if (
            !food_name.trim() ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0 ||
            !Number.isInteger(Number(category_id)) ||
            Number(category_id) <= 0 ||
            !Number.isInteger(Number(stock_quantity)) ||
            Number(stock_quantity) < 0 ||
            !["true", "false"].includes(String(is_available))
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid food item details."
            });
        }

        // Use the newly uploaded image when provided.
        // Otherwise, use a supplied image URL or retain the existing image.
        const newImageUrl = req.file
            ? `/uploads/foods/${req.file.filename}`
            : (image_url || null);

        const sql = `
            UPDATE food_items
            SET
                food_name = ?,
                description = ?,
                price = ?,
                category_id = ?,
                image_url = COALESCE(?, image_url),
                is_available = ?,
                stock_quantity = ?
            WHERE food_id = ?
        `;

        const values = [
            food_name.trim(),
            description || null,
            Number(price),
            Number(category_id),
            newImageUrl,
            String(is_available) === "true",
            Number(stock_quantity),
            Number(foodId)
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error(
                    "Failed to update food item:",
                    err.message
                );

                if (err.code === "ER_NO_REFERENCED_ROW_2") {
                    return res.status(400).json({
                        success: false,
                        message: "The selected category does not exist."
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: "Failed to update food item."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Food item not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Food item updated successfully.",
                image_url: newImageUrl
            });
        });
    }
);


// Delete a food item (Admin only)
// Soft delete: mark the food item as unavailable
app.delete(
    "/api/admin/foods/:id",
    authenticateToken,
    authorizeRole("admin"),
    (req, res) => {
        const foodId = Number(req.params.id);

        // Validate food ID
        if (!Number.isInteger(foodId) || foodId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid food item ID."
            });
        }

        const sql = `
            UPDATE food_items
            SET is_available = 0
            WHERE food_id = ?
        `;

        db.query(sql, [foodId], (err, result) => {
            if (err) {
                console.error(
                    "Failed to mark food item as unavailable:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Failed to delete food item."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Food item not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Food item deleted successfully."
            });
        });
    }
);


// Student Registration API
app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;

    // Step 1: Validate the input
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email, and password are required"
        });
    }

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "Name, email, and password must be text"
        });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
        !trimmedName ||
        trimmedName.length > 100 ||
        normalizedEmail.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        password.length < 8
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid name and email. Password must contain at least 8 characters."
        });
    }

    // Step 2: Check whether the email already exists
    const checkEmailSql = `
        SELECT user_id
        FROM users
        WHERE email = ?
    `;

    db.query(checkEmailSql, [normalizedEmail], (err, result) => {
        if (err) {
            console.error("Email check failed:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to register student"
            });
        }

        if (result.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Step 3: Hash the password
        const bcrypt = require("bcrypt");

        bcrypt.hash(password, 12, (hashError, hashedPassword) => {
            if (hashError) {
                console.error("Password hashing failed:", hashError.message);

                return res.status(500).json({
                    success: false,
                    message: "Unable to register student"
                });
            }

            // Step 4: Insert the student into MySQL
            const insertSql = `
                INSERT INTO users (name, email, password, role)
                VALUES (?, ?, ?, 'student')
            `;

            db.query(
                insertSql,
                [trimmedName, normalizedEmail, hashedPassword],
                (insertError, insertResult) => {
                    if (insertError) {
                        if (insertError.code === "ER_DUP_ENTRY") {
                            return res.status(409).json({
                                success: false,
                                message: "Email is already registered"
                            });
                        }

                        console.error("Student registration failed:", insertError.message);

                        return res.status(500).json({
                            success: false,
                            message: "Unable to register student"
                        });
                    }

                    return res.status(201).json({
                        success: true,
                        message: "Student registered successfully",
                        student: {
                            user_id: insertResult.insertId,
                            name: trimmedName,
                            email: normalizedEmail,
                            role: "student"
                        }
                    });
                }
            );
        });
    });
});
// Student Login API
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    // Step 1: Validate input
    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Step 2: Find the student by email
    const sql = `
        SELECT user_id, name, email, password, role
        FROM users
        WHERE email = ?
    `;

    db.query(sql, [normalizedEmail], (err, result) => {
        if (err) {
            console.error("Login query failed:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to log in"
            });
        }

        // Step 3: Check whether the account exists
        if (result.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result[0];

        // Step 4: Compare the entered password with the stored hash
        bcrypt.compare(password, user.password, (compareError, isMatch) => {
            if (compareError) {
                console.error("Password verification failed:", compareError.message);

                return res.status(500).json({
                    success: false,
                    message: "Unable to log in"
                });
            }

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }

            // Step 5: Create a JWT token
            const jwtSecret = process.env.JWT_SECRET;

            if (!jwtSecret) {
                console.error("JWT_SECRET is missing from the environment");

                return res.status(500).json({
                    success: false,
                    message: "Authentication is not configured"
                });
            }

            const token = jwt.sign(
                {
                    userId: user.user_id,
                    role: user.role
                },
                jwtSecret,
                {
                    expiresIn: "2h"
                }
            );

            // Step 6: Send the response without the password
            return res.status(200).json({
                success: true,
                message: "Login successful",
                token: token,
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    });
});
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Smart Canteen backend is running!"
    });
});
// Protected API: Requires a valid JWT token
// Protected API: Requires a valid JWT token
app.get("/api/auth/profile", authenticateToken, (req, res) => {
const userId = req.user.userId;


const sql = `
    SELECT user_id, name, email, role
    FROM users
    WHERE user_id = ?
`;

db.query(sql, [userId], (err, results) => {
    if (err) {
        console.error("Profile fetch error:", err.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch user profile."
        });
    }

    if (results.length === 0) {
        return res.status(401).json({
            success: false,
            message: "User account not found."
        });
    }

    const user = results[0];

    return res.status(200).json({
        success: true,
        message: "Profile retrieved successfully.",
        user: {
            userId: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});


});

app.get("/api/categories", (req, res) => {
    const sql = "SELECT * FROM categories";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("Failed to fetch categories:", err.message);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch categories"
            });
        }

        res.status(200).json({
            success: true,
            categories: result
        });
    });
});
app.get("/api/foods", (req, res) => {
    const search = req.query.search || "";
    const category = req.query.category || "";
    const available = req.query.available;

    let sql = `
        SELECT
            f.food_id,
            f.food_name,
            f.description,
            f.price,
            f.image_url,
            f.is_available,
            f.stock_quantity,
            c.category_name
        FROM food_items AS f
        JOIN categories AS c
            ON f.category_id = c.category_id
        WHERE f.food_name LIKE ?
          AND c.category_name LIKE ?
    `;

    const params = [`%${search}%`, `%${category}%`];

    if (available === "true") {
        sql += " AND f.is_available = TRUE";
    } else if (available === "false") {
        sql += " AND f.is_available = FALSE";
    }

    sql += " ORDER BY f.food_id";

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Failed to fetch food items:", err.message);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch food items"
            });
        }

        res.status(200).json({
            success: true,
            foods: result
        });
    });
});


// Handle natural variations of canteen-related questions using MySQL
app.post("/api/chatbot", (req, res) => {
    const message = req.body.message;

    if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({
            success: false,
            message: "Please enter a question."
        });
    }

    const question = message
        .toLowerCase()
        .replace(/[?!.,']/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const sql = `
    SELECT
        f.food_name,
        f.price,
        f.is_available,
        f.stock_quantity,
        c.category_name
    FROM food_items AS f
    JOIN categories AS c
        ON f.category_id = c.category_id
    ORDER BY f.food_id
`;

    db.query(sql, (err, foods) => {
        if (err) {
            console.error("Chatbot menu query failed:", err.message);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve menu information."
            });
        }

        const availableFoods = foods.filter(
            (food) =>
                Boolean(food.is_available) &&
                Number(food.stock_quantity) > 0
        );

        const formatPrice = (price) =>
            `₹${Number(price).toFixed(2)}`;

        const formatFood = (food) =>
            `${food.food_name} (${formatPrice(food.price)})`;

        const findFood = () => {
            return [...foods]
                .sort(
                    (a, b) =>
                        b.food_name.length - a.food_name.length
                )
                .find((food) =>
                    question.includes(food.food_name.toLowerCase())
                );
        };

        const matchedFood = findFood();

        let reply;

        const asksForPrice =
            /\b(price|cost|costs|costing|much|charge|charges|rate|rates|expensive)\b/.test(question) ||
            /\bhow much\b/.test(question) ||
            /\bwhat.*(?:pay|spend)\b/.test(question);

        const asksForAvailability =
            /\b(available|availability|stock|have|sell|selling|offer|offers|left|in stock)\b/.test(question) ||
            /\bdo you have\b/.test(question) ||
            /\bcan i get\b/.test(question) ||
            /\bcan i order\b/.test(question) ||
            /\bis there\b/.test(question);

        const asksForMenu =
            /\b(menu|all foods|all food items|food items|what food|which foods|what can i eat|show food|show me food|list foods|list food)\b/.test(question);

        const asksForCheapest =
            /\b(cheapest|lowest price|least expensive|most affordable)\b/.test(question);

        const asksForRecommendation =
    /\b(recommend|recommendation|suggest|suggestion|should i eat|what can i eat|something cheap|something affordable|good food|which food)\b/.test(question);
            
const requestedCategory = question.includes("breakfast")
    ? "Breakfast"
    : question.includes("lunch")
        ? "Lunch"
        : /\b(snack|snacks)\b/.test(question)
            ? "Snacks"
            : /\b(drink|drinks|beverage|beverages)\b/.test(question)
                ? "Drinks"
                : null;

            const budgetMatch = question.match(
            /(?:under|below|within|budget of|for|upto|up to|less than|not more than)\s*(?:rs\.?|rupees?|₹)?\s*(\d+(?:\.\d+)?)/i
        );

        if (
            /\b(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(question)
        ) {
            reply =
                "Hello! Welcome to Smart Canteen. You can ask me about our menu, food prices, availability, or affordable food options.";
        } else if (
            asksForPrice &&
            matchedFood
        ) {
            reply = `${matchedFood.food_name} costs ${formatPrice(matchedFood.price)}.`;

            if (
                !Boolean(matchedFood.is_available) ||
                Number(matchedFood.stock_quantity) <= 0
            ) {
                reply += " However, this item is currently unavailable.";
            }
        } else if (
            asksForAvailability &&
            matchedFood
        ) {
            const isAvailable =
                Boolean(matchedFood.is_available) &&
                Number(matchedFood.stock_quantity) > 0;

            reply = isAvailable
                ? `Yes! ${matchedFood.food_name} is available for ${formatPrice(matchedFood.price)}.`
                : `Sorry, ${matchedFood.food_name} is currently unavailable.`;
        } else if (requestedCategory) {
    let categoryFoods = availableFoods.filter(
        (food) =>
            food.category_name.toLowerCase() ===
            requestedCategory.toLowerCase()
    );

    if (budgetMatch) {
        const budget = Number(budgetMatch[1]);

        categoryFoods = categoryFoods.filter(
            (food) => Number(food.price) <= budget
        );
    }

    if (categoryFoods.length === 0) {
        reply = budgetMatch
            ? `Sorry, no available ${requestedCategory.toLowerCase()} items match your budget.`
            : `Sorry, no ${requestedCategory.toLowerCase()} items are currently available.`;
    } else {
        reply = `Here are the available ${requestedCategory.toLowerCase()} items: ${categoryFoods
            .map(formatFood)
            .join(", ")}.`;
    }
} else if (asksForRecommendation) {
    let recommendedFoods = [];

    if (budgetMatch) {
        const budget = Number(budgetMatch[1]);

        recommendedFoods = availableFoods
            .filter((food) => Number(food.price) <= budget)
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 3);

        if (recommendedFoods.length === 0) {
            reply = `Sorry, I couldn't find available food within your ₹${budget.toFixed(2)} budget.`;
        } else {
            reply = `Here are my top recommendations within ₹${budget.toFixed(2)}: ${recommendedFoods
                .map(formatFood)
                .join(", ")}.`;
        }
    } else {
        recommendedFoods = [...availableFoods]
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 3);

        if (recommendedFoods.length === 0) {
            reply = "Sorry, no food items are currently available.";
        } else {
            reply = `Here are my recommendations: ${recommendedFoods
                .map(formatFood)
                .join(", ")}.`;
        }
    }
} else if (asksForCheapest) {
            if (availableFoods.length === 0) {
                reply = "Sorry, no food items are currently available.";
            } else {
                const cheapestPrice = Math.min(
                    ...availableFoods.map((food) => Number(food.price))
                );

                const cheapestFoods = availableFoods.filter(
                    (food) => Number(food.price) === cheapestPrice
                );

                reply = `The cheapest available food is ${cheapestFoods
                    .map(formatFood)
                    .join(", ")}.`;
            }
        }
        else if (budgetMatch) {
            const budget = Number(budgetMatch[1]);

            const affordableFoods = availableFoods.filter(
                (food) => Number(food.price) <= budget
            );

            if (affordableFoods.length === 0) {
                reply = `Sorry, no currently available food items cost ₹${budget.toFixed(2)} or less.`;
            } else {
                reply = `Here are the available foods within your ₹${budget.toFixed(2)} budget: ${affordableFoods
                    .map(formatFood)
                    .join(", ")}.`;
            }
        } else if (asksForMenu) {
            if (availableFoods.length === 0) {
                reply = "Sorry, no food items are currently available.";
            } else {
                reply = `Here are the currently available food items: ${availableFoods
                    .map(formatFood)
                    .join(", ")}.`;
            }
        } else if (
            /\b(order status|track my order|track order|where is my order|my orders|order history)\b/.test(question)
        ) {
            reply =
                "You can check your order status in the Order History section of your account.";
        } else if (
            matchedFood &&
            asksForAvailability
        ) {
            reply = `Let me help you check ${matchedFood.food_name}'s availability.`;
        } else {
            reply =
                "I can help with food prices, availability, the menu, the cheapest food, and budget-friendly options. For example, ask 'How much is Idli?', 'Do you have Dosa?', or 'What can I get under ₹50?'";
        }

        return res.status(200).json({
            success: true,
            reply
        });
    });
});


// Get food items with their nutritional information
app.get("/api/nutrition", (req, res) => {
    const search = req.query.search || "";

    const sql = `
        SELECT
            f.food_id,
            f.food_name,
            f.description,
            f.price,
            n.serving_size_grams,
            n.calories_kcal,
            n.protein_g,
            n.carbohydrates_g,
            n.fat_g,
            n.fiber_g,
            n.data_source,
            n.verification_status
        FROM food_items AS f
        LEFT JOIN food_nutrition AS n
            ON f.food_id = n.food_id
        WHERE f.food_name LIKE ?
        ORDER BY f.food_id
    `;

    const params = [`%${search}%`];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(
                "Failed to fetch nutrition information:",
                err.message
            );

            return res.status(500).json({
                success: false,
                message: "Failed to fetch nutrition information"
            });
        }

        return res.status(200).json({
            success: true,
            count: result.length,
            nutrition: result
        });
    });
});

app.get("/api/foods/:id", (req, res) => {
    const foodId = req.params.id;

    const sql = `
        SELECT
            f.food_id,
            f.food_name,
            f.description,
            f.price,
            f.image_url,
            f.is_available,
            f.stock_quantity,
            c.category_name
        FROM food_items AS f
        JOIN categories AS c
            ON f.category_id = c.category_id
        WHERE f.food_id = ?;
    `;

    db.query(sql, [foodId], (err, result) => {
        if (err) {
            console.error("Failed to fetch food item:", err.message);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch food item"
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Food item not found"
            });
        }

        res.status(200).json({
            success: true,
            food: result[0]
        });
    });
});

app.get("/", (req, res) => {
    res.send("Smart Canteen Ordering Application Backend is Running!");
});

app.get("/db-test", (req, res) => {
    db.query("SELECT DATABASE() AS databaseName", (err, result) => {
        if (err) {
            console.error("Database query failed:", err.message);
            return res.status(500).send("Database query failed");
        }

        res.json({
            message: "Database query successful!",
            database: result[0].databaseName
        });
    });
});
// ============================================
// PHASE 8: STUDENT ORDER PLACEMENT API
// ============================================

app.post(
    "/api/orders",
    authenticateToken,
    authorizeRole("student"),
    (req, res) => {
        const { items } = req.body;

        // Step 1: Validate the request
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty."
            });
        }

        // Validate food IDs and quantities
        const seenFoodIds = new Set();

        for (const item of items) {
            const foodId = Number(item.food_id);
            const quantity = Number(item.quantity);

            if (
                !Number.isSafeInteger(foodId) ||
                foodId <= 0 ||
                !Number.isSafeInteger(quantity) ||
                quantity <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have a valid food_id and positive quantity."
                });
            }

            if (seenFoodIds.has(foodId)) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate food IDs are not allowed."
                });
            }

            seenFoodIds.add(foodId);
        }

        // Step 2: Get a dedicated connection for the transaction
        db.getConnection((connectionError, connection) => {
            if (connectionError) {
                console.error("Database connection error:", connectionError.message);

                return res.status(500).json({
                    success: false,
                    message: "Unable to connect to the database."
                });
            }

            // Helper function for database queries
            const query = (sql, values = []) =>
                new Promise((resolve, reject) => {
                    connection.query(sql, values, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });

            // Step 3: Start the transaction
            connection.beginTransaction(async (transactionError) => {
                if (transactionError) {
                    connection.release();

                    console.error(
                        "Transaction error:",
                        transactionError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to start the order transaction."
                    });
                }

                try {
                    const orderedItems = [];
                    let totalAmount = 0;

                    // Step 4: Check each food item in the database
                    for (const item of items) {
                        const foodId = Number(item.food_id);
                        const quantity = Number(item.quantity);

                        const foods = await query(
                            `SELECT
                                food_id,
                                food_name,
                                price,
                                is_available,
                                stock_quantity
                             FROM food_items
                             WHERE food_id = ?
                             FOR UPDATE`,
                            [foodId]
                        );

                        if (foods.length === 0) {
                            const error = new Error(
                                `Food item ${foodId} was not found.`
                            );
                            error.statusCode = 404;
                            throw error;
                        }

                        const food = foods[0];

                        if (!food.is_available) {
                            const error = new Error(
                                `${food.food_name} is currently unavailable.`
                            );
                            error.statusCode = 400;
                            throw error;
                        }

                        if (food.stock_quantity < quantity) {
                            const error = new Error(
                                `Insufficient stock for ${food.food_name}. Available: ${food.stock_quantity}.`
                            );
                            error.statusCode = 400;
                            throw error;
                        }

                        const unitPrice = Number(food.price);
                        const itemTotal = Math.round(
                            unitPrice * 100 * quantity
                        ) / 100;

                        totalAmount += itemTotal;

                        orderedItems.push({
                            food_id: food.food_id,
                            food_name: food.food_name,
                            quantity,
                            price: unitPrice,
                            item_total: itemTotal
                        });
                    }

                    totalAmount = Math.round(totalAmount * 100) / 100;

                    // Step 5: Create the order
                    const orderResult = await query(
                        `INSERT INTO orders
                            (user_id, total_amount, order_status)
                         VALUES (?, ?, 'PLACED')`,
                        [req.user.userId, totalAmount]
                    );

                    const orderId = orderResult.insertId;

                    // Step 6: Save the ordered food items
                    for (const item of orderedItems) {
                        await query(
                            `INSERT INTO order_items
                                (order_id, food_id, quantity, price)
                             VALUES (?, ?, ?, ?)`,
                            [
                                orderId,
                                item.food_id,
                                item.quantity,
                                item.price
                            ]
                        );
                    }

                    // Step 7: Reduce food stock
                    for (const item of orderedItems) {
                        const stockResult = await query(
                            `UPDATE food_items
                             SET stock_quantity = stock_quantity - ?
                             WHERE food_id = ?
                               AND stock_quantity >= ?`,
                            [
                                item.quantity,
                                item.food_id,
                                item.quantity
                            ]
                        );

                        if (stockResult.affectedRows !== 1) {
                            const error = new Error(
                                `Unable to update stock for ${item.food_name}.`
                            );
                            error.statusCode = 409;
                            throw error;
                        }
                    }

                    // Step 8: Commit all changes together
                    await new Promise((resolve, reject) => {
                        connection.commit((error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });

                    return res.status(201).json({
                        success: true,
                        message: "Order placed successfully.",
                        order: {
                            order_id: orderId,
                            total_amount: totalAmount,
                            order_status: "PLACED",
                            items: orderedItems
                        }
                    });

                } catch (error) {
                    // Roll back the order and stock changes on failure
                    await new Promise((resolve) => {
                        connection.rollback(() => resolve());
                    });

                    console.error("Order placement failed:", error.message);

                    return res.status(error.statusCode || 500).json({
                        success: false,
                        message: error.statusCode
                            ? error.message
                            : "Unable to place the order. Please try again."
                    });

                } finally {
                    // Return the connection to the pool
                    connection.release();
                }
            });
        });
    }
);

// ============================================
// PHASE 8: GET STUDENT ORDER HISTORY
// ============================================

app.get(
    "/api/orders",
    authenticateToken,
    authorizeRole("student"),
    (req, res) => {
        const userId = req.user.userId;

        const sql = `
            SELECT
                order_id,
                total_amount,
                order_status,
                created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;

        db.query(sql, [userId], (err, results) => {
            if (err) {
                console.error("Order history error:", err.message);

                return res.status(500).json({
                    success: false,
                    message: "Unable to retrieve order history."
                });
            }

            return res.status(200).json({
                success: true,
                count: results.length,
                orders: results
            });
        });
    }
);

// ============================================
// PHASE 8: GET DETAILS OF ONE STUDENT ORDER
// ============================================

app.get(
    "/api/orders/:id",
    authenticateToken,
    authorizeRole("student"),
    (req, res) => {
        const userId = req.user.userId;
        const orderId = Number(req.params.id);

        // Validate the order ID
        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        // Find an order belonging to the logged-in student
        const orderSql = `
            SELECT
                order_id,
                total_amount,
                order_status,
                created_at
            FROM orders
            WHERE order_id = ?
              AND user_id = ?
        `;

        db.query(
            orderSql,
            [orderId, userId],
            (err, orderResults) => {
                if (err) {
                    console.error("Order details error:", err.message);

                    return res.status(500).json({
                        success: false,
                        message: "Unable to retrieve order details."
                    });
                }

                if (orderResults.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Order not found."
                    });
                }

                const order = orderResults[0];

                // Retrieve the food items belonging to this order
                const itemsSql = `
                    SELECT
                        oi.food_id,
                        fi.food_name,
                        oi.quantity,
                        oi.price,
                        (oi.quantity * oi.price) AS item_total
                    FROM order_items oi
                    JOIN food_items fi
                        ON oi.food_id = fi.food_id
                    WHERE oi.order_id = ?
                `;

                db.query(
                    itemsSql,
                    [orderId],
                    (itemsError, itemResults) => {
                        if (itemsError) {
                            console.error(
                                "Order items error:",
                                itemsError.message
                            );

                            return res.status(500).json({
                                success: false,
                                message: "Unable to retrieve order items."
                            });
                        }

                        return res.status(200).json({
                            success: true,
                            order: {
                                ...order,
                                items: itemResults
                            }
                        });
                    }
                );
            }
        );
    }
);
// Phase 10: Create a payment record
app.post(
    "/api/payments",
    authenticateToken,
    authorizeRole("student"),
    async (req, res) => {
        const { order_id, payment_method } = req.body;
        const userId = req.user.userId;

        // Step 1: Validate the request
        const orderId = Number(order_id);

        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid order_id is required."
            });
        }

        const allowedMethods = ["CASH", "UPI", "CARD"];

        if (!allowedMethods.includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Payment method must be CASH, UPI, or CARD."
            });
        }

        // Step 2: Get a database connection
        db.getConnection((connectionError, connection) => {
            if (connectionError) {
                console.error(
                    "Payment database connection error:",
                    connectionError.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to connect to the database."
                });
            }

            // Helper function for database queries
            const query = (sql, values = []) =>
                new Promise((resolve, reject) => {
                    connection.query(sql, values, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });

            // Step 3: Begin a transaction
            connection.beginTransaction(async (transactionError) => {
                if (transactionError) {
                    connection.release();

                    console.error(
                        "Payment transaction error:",
                        transactionError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to start the payment transaction."
                    });
                }

                let responseSent = false;

                try {
                    // Step 4: Verify that this order belongs to the student
                    const orders = await query(
                        `SELECT order_id, order_status
                         FROM orders
                         WHERE order_id = ?
                           AND user_id = ?
                         FOR UPDATE`,
                        [orderId, userId]
                    );

                    if (orders.length === 0) {
                        const error = new Error(
                            "Order not found for this student."
                        );
                        error.statusCode = 404;
                        throw error;
                    }

                    if (orders[0].order_status !== "PLACED") {
                        const error = new Error(
                            "Payment can only be recorded for an order with PLACED status."
                        );
                        error.statusCode = 400;
                        throw error;
                    }

                    // Step 5: Prevent duplicate payment records
                    const existingPayments = await query(
                        `SELECT payment_id
                         FROM payments
                         WHERE order_id = ?
                         FOR UPDATE`,
                        [orderId]
                    );

                    if (existingPayments.length > 0) {
                        const error = new Error(
                            "A payment record already exists for this order."
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    // Step 6: Create a pending payment record
                    const paymentResult = await query(
                        `INSERT INTO payments
                            (order_id, payment_method, payment_status)
                         VALUES (?, ?, 'PENDING')`,
                        [orderId, payment_method]
                    );

                    // Step 7: Commit the transaction
                    await new Promise((resolve, reject) => {
                        connection.commit((error) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });

                    responseSent = true;

                    return res.status(201).json({
                        success: true,
                        message: "Payment record created successfully.",
                        payment: {
                            payment_id: paymentResult.insertId,
                            order_id: orderId,
                            payment_method,
                            payment_status: "PENDING"
                        }
                    });

                } catch (error) {
                    // Roll back unsuccessful database changes
                    await new Promise((resolve) => {
                        connection.rollback(() => resolve());
                    });

                    console.error(
                        "Payment creation error:",
                        error.message
                    );

                    if (!responseSent) {
                        responseSent = true;

                        return res.status(error.statusCode || 500).json({
                            success: false,
                            message: error.statusCode
                                ? error.message
                                : "Unable to create the payment record."
                        });
                    }

                } finally {
                    // Return the connection to the pool
                    connection.release();
                }
            });
        });
    }
);

// Phase 10: Simulate an online payment result
app.put(
    "/api/payments/:paymentId/simulate",
    authenticateToken,
    authorizeRole("student"),
    async (req, res) => {
        const paymentId = Number(req.params.paymentId);
        const { result } = req.body;
        const userId = req.user.userId;

        // Step 1: Validate the payment ID
        if (!Number.isSafeInteger(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid payment ID is required."
            });
        }

        // Step 2: Accept only simulated success or failure
        if (!["SUCCESS", "FAILED"].includes(result)) {
            return res.status(400).json({
                success: false,
                message: "Result must be SUCCESS or FAILED."
            });
        }

        // Step 3: Get a database connection
        db.getConnection((connectionError, connection) => {
            if (connectionError) {
                console.error(
                    "Payment simulation connection error:",
                    connectionError.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to connect to the database."
                });
            }

            // Helper for database queries
            const query = (sql, values = []) =>
                new Promise((resolve, reject) => {
                    connection.query(sql, values, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });

            // Helper for committing or rolling back
            const finishTransaction = (action) =>
                new Promise((resolve, reject) => {
                    connection[action]((error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });

            connection.beginTransaction(async (transactionError) => {
                if (transactionError) {
                    connection.release();

                    console.error(
                        "Payment simulation transaction error:",
                        transactionError.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to start the payment transaction."
                    });
                }

                let transactionFinished = false;

                try {
                    // Step 4: Find the payment and verify ownership
                    const payments = await query(
                        `SELECT
                            p.payment_id,
                            p.order_id,
                            p.payment_method,
                            p.payment_status,
                            o.order_status
                         FROM payments p
                         INNER JOIN orders o
                            ON p.order_id = o.order_id
                         WHERE p.payment_id = ?
                           AND o.user_id = ?
                         FOR UPDATE`,
                        [paymentId, userId]
                    );

                    if (payments.length === 0) {
                        const error = new Error(
                            "Payment not found for this student."
                        );
                        error.statusCode = 404;
                        throw error;
                    }

                    const payment = payments[0];

                    // Step 5: Only online payments can be simulated
                    if (!["UPI", "CARD"].includes(payment.payment_method)) {
                        const error = new Error(
                            "Only UPI and CARD payments can be simulated."
                        );
                        error.statusCode = 400;
                        throw error;
                    }

                    // Step 6: Prevent repeated processing
                    if (payment.payment_status !== "PENDING") {
                        const error = new Error(
                            "This payment has already been processed."
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    if (payment.order_status !== "PLACED") {
                        const error = new Error(
                            "Only orders with PLACED status can be processed."
                        );
                        error.statusCode = 400;
                        throw error;
                    }

                    // Step 7: Record the simulated payment result
                    const crypto = require("crypto");
                    const transactionId = `SIM-${crypto.randomUUID()}`;

                    await query(
                        `UPDATE payments
                         SET payment_status = ?,
                             transaction_id = ?,
                             paid_at = CASE
                                 WHEN ? = 'SUCCESS' THEN CURRENT_TIMESTAMP
                                 ELSE NULL
                             END
                         WHERE payment_id = ?`,
                        [result, transactionId, result, paymentId]
                    );

                    if (result === "FAILED") {
                        // Step 8: Cancel the order
                        await query(
                            `UPDATE orders
                             SET order_status = 'CANCELLED'
                             WHERE order_id = ?
                               AND order_status = 'PLACED'`,
                            [payment.order_id]
                        );

                        // Step 9: Retrieve the ordered food quantities
                        const orderedItems = await query(
                            `SELECT food_id, quantity
                             FROM order_items
                             WHERE order_id = ?`,
                            [payment.order_id]
                        );

                        // Step 10: Restore stock and log each restoration
                        for (const item of orderedItems) {
                            await query(
                                `UPDATE food_items
                                 SET stock_quantity = stock_quantity + ?
                                 WHERE food_id = ?`,
                                [item.quantity, item.food_id]
                            );

                            await query(
                                `INSERT INTO inventory_logs
                                    (food_id, quantity_change, reason)
                                 VALUES (?, ?, ?)`,
                                [
                                    item.food_id,
                                    item.quantity,
                                    `Restored after simulated payment failure for order ${payment.order_id}`
                                ]
                            );
                        }
                    }

                    // Step 11: Save all changes together
                    await finishTransaction("commit");
                    transactionFinished = true;

                    return res.status(200).json({
                        success: true,
                        message:
                            result === "SUCCESS"
                                ? "Simulated online payment successful."
                                : "Simulated online payment failed. Order cancelled and stock restored.",
                        payment: {
                            payment_id: paymentId,
                            order_id: payment.order_id,
                            payment_method: payment.payment_method,
                            payment_status: result,
                            transaction_id: transactionId
                        },
                        order_status:
                            result === "FAILED" ? "CANCELLED" : "PLACED"
                    });

                } catch (error) {
                    if (!transactionFinished) {
                        try {
                            await finishTransaction("rollback");
                            transactionFinished = true;
                        } catch (rollbackError) {
                            console.error(
                                "Payment rollback error:",
                                rollbackError.message
                            );
                        }
                    }

                    console.error(
                        "Payment simulation error:",
                        error.message
                    );

                    return res.status(error.statusCode || 500).json({
                        success: false,
                        message: error.statusCode
                            ? error.message
                            : "Unable to process the simulated payment."
                    });

                } finally {
                    connection.release();
                }
            });
        });
    }
);


// Get notifications for the logged-in student
app.get(
    "/api/notifications",
    authenticateToken,
    authorizeRole("student"),
    (req, res) => {
        const userId = req.user.userId;

        const sql = `
            SELECT
                notification_id,
                order_id,
                message,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;

        db.query(sql, [userId], (err, results) => {
            if (err) {
                console.error(
                    "Fetch notifications error:",
                    err.message
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to retrieve notifications."
                });
            }

            return res.status(200).json({
                success: true,
                notifications: results
            });
        });
    }
);


// Mark a notification as read
app.put(
    "/api/notifications/:notificationId/read",
    authenticateToken,
    authorizeRole("student"),
    (req, res) => {
        const userId = req.user.userId;
        const notificationId = Number(req.params.notificationId);

        if (
            !Number.isSafeInteger(notificationId) ||
            notificationId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
        }

        const sql = `
            UPDATE notifications
            SET is_read = 1
            WHERE notification_id = ?
              AND user_id = ?
        `;

        db.query(
            sql,
            [notificationId, userId],
            (err, result) => {
                if (err) {
                    console.error(
                        "Mark notification as read error:",
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: "Unable to update notification."
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Notification not found."
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: "Notification marked as read successfully."
                });
            }
        );
    }
);



app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
