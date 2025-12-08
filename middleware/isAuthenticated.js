const { JsonWebTokenError } = require("jsonwebtoken");
const jwt = require('jsonwebtoken');
const userModel = require("../models/user.models");


const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                success: false,
                message: "Authorization token is missing or invalid"
            })
        }
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(400).json({
                    success: false,
                    message: "The Registration Token has expired, Please login again"
                })
            }
            return res.status(400).json({
                success: false,
                message: "Access Token is missing or invalid"
            })
        }

        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }
        if(!user.isLoggedIn){
            return res.status(400).json({
                success: false,
                message: "Please Login First!!"
            })
        }
        req.user = user
        req.id = user._id;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const isAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access deniend admins only"
        })
    }
}

module.exports = { isAuthenticated, isAdmin };
