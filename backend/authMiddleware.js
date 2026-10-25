const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    // Step 1: Read the Authorization header
    const authHeader = req.headers.authorization;

    // Step 2: Check whether the token was provided
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please provide a valid token."
        });
    }

    // Step 3: Extract the token
    const token = authHeader.split(" ")[1];

    // Step 4: Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Step 5: Attach the user's information to the request
        req.user = decoded;

        // Step 6: Allow the request to continue
        next();
    });
}

module.exports = authenticateToken;