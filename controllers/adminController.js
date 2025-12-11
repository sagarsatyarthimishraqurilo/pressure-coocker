const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Product = require("../models/productModels");
const cloudinary = require("../utils/cloudinary");

// Block / Unblock vendor
const setVendorBlockState = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { block } = req.body; // boolean
        if (typeof block === 'undefined') {
            return res.status(400).json({ success: false, message: "block boolean is required in body" });
        }

        const vendor = await userModel.findById(vendorId);
        if (!vendor || vendor.role !== 'vendor') {
            return res.status(404).json({ success: false, message: "Vendor not found" });
        }

        vendor.isBlocked = !!block;
        await vendor.save();

        // when blocking -> set products inactive
        if (vendor.isBlocked) {
            await Product.updateMany({ userId: vendor._id }, { $set: { isActive: false } });
        } else {
            // when unblocking -> don't auto-reactivate products by default (admin decision), but you may choose to activate:
            // await Product.updateMany({ userId: vendor._id }, { $set: { isActive: true } });
        }

        return res.status(200).json({ success: true, message: `Vendor ${vendor.isBlocked ? 'blocked' : 'unblocked'} successfully` });
    } catch (err) {
        console.error("setVendorBlockState", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};


//Admin Register Here .....
const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const user = await userModel.findOne({ email })
        if (user) {
            res.status(400).json({
                success: false,
                message: "User Already exists",
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashPassword,
        });

        newUser.role = 'admin'
        newUser.token = null;
        newUser.isVerified = true;
        newUser.isLoggedIn = true;
        await newUser.save();

        return res.status(201).json({
            success: true,
            message: "User register successfully",
            Data: {
                items: [newUser]
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const deleteUserById = async (req, res) => {
    try {
        const userId = req.params.userId;
        const loggedInUser = req.user; // from authMiddleware

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (loggedInUser._id.toString() !== userId && loggedInUser.role !== 'admin') {
            return res.status(403).json({ success: false, message: "You are not authorized to delete this user" });
        }

        if (loggedInUser._id.toString() === userId && loggedInUser.role === 'admin') {
            return res.status(400).json({ success: false, message: "Admins cannot delete their own account from this endpoint" });
        }

        // If vendor -> soft-delete their products (isActive=false) to preserve order history
        if (user.role === 'vendor') {
            try {
                await Product.updateMany({ userId: user._id }, { $set: { isActive: false } });
            } catch (prodErr) {
                console.error("Error soft-deleting vendor products", prodErr);
            }
        }

        // Delete profile picture from Cloudinary if exists (optional: keep images for history; here we keep profile pic deletion)
        if (user.profilePicPublicId) {
            try {
                await cloudinary.uploader.destroy(user.profilePicPublicId);
            } catch (cloudErr) {
                console.warn("Cloudinary delete failed for profile pic:", cloudErr);
            }
        }

        // Finally delete user
        const deletedUser = await userModel.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            deletedUser: {
                id: deletedUser._id,
                email: deletedUser.email,
                firstName: deletedUser.firstName,
                lastName: deletedUser.lastName
            }
        });

    } catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get users by role (admin only) e.g. /admin/users/role/vendor or /admin/users/role/user
const getUsersByRole = async (req, res) => {
    try {
        const role = req.params.role;
        if (!role) return res.status(400).json({ success: false, message: "role is required" });
        const allowed = ['user', 'vendor', 'admin'];
        if (!allowed.includes(role)) return res.status(400).json({ success: false, message: "invalid role" });

        const users = await userModel.find({ role }).select("-password -otp -otpExpiry -token");
        return res.status(200).json({ success: true, count: users.length, users });
    } catch (err) {
        console.error("getUsersByRole", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Get vendors with their products (admin only). optional query ?page & ?limit
const getVendorsWithProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');

        // aggregate vendors and lookup their products
        const agg = [
            { $match: { role: "vendor" } },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "userId",
                    as: "products"
                }
            },
            {
                $project: {
                    password: 0,
                    token: 0,
                    otp: 0,
                    otpExpiry: 0,
                    "products.productDescription": 0 // optionally hide large description
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit }
        ];

        const vendors = await userModel.aggregate(agg);
        return res.status(200).json({ success: true, page, limit, items: vendors });
    } catch (err) {
        console.error("getVendorsWithProducts", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};


module.exports = {
    register,
    deleteUserById,
    setVendorBlockState,
    getUsersByRole,
    getVendorsWithProducts
}