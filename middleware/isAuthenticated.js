// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.models');

const getTokenFromHeader = (req) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1];
};

const isAuthenticated = async (req, res, next) => {
    try {
        const token = getTokenFromHeader(req);
        if (!token) {
            return res.status(401).json({ success: false, message: "Authorization token is missing or invalid" });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ success: false, message: "Access token expired. Please login again." });
            }
            return res.status(401).json({ success: false, message: "Access token invalid" });
        }

        const userId = decoded.id || decoded.userId || decoded._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Token did not contain user id" });
        }

        const user = await userModel.findById(userId).select("-password -otp -otpExpiry");
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }
        if (!user.isLoggedIn) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Your account has been blocked. Contact administrator." });
        }
        req.user = user;
        req.id = user._id;
        next();
    } catch (error) {
        console.error("isAuthenticated error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: "Access denied, admins only" });
};

const isVendor = (req, res, next) => {
    if (req.user && req.user.role === 'vendor') {
        if (req.user.isBlocked) {
            return res.status(403).json({ success: false, message: "Vendor account blocked" });
        }
        return next();
    }
    return res.status(403).json({ success: false, message: "Access denied, vendors only" });
};

// Generic role checker: authorizeRoles('admin','vendor')
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });
        if (roles.includes(req.user.role)) return next();
        return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
    };
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isVendor,
    authorizeRoles
};
