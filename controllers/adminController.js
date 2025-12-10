const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
        const loggedInUser = req.user; // From isAuthenticated middleware

        // Check if the user exists
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        // Authorization check: Only admin or the user themselves can delete
        if (loggedInUser._id.toString() !== userId && loggedInUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this user"
            })
        }

        // Prevent self-deletion for admin (optional)
        if (loggedInUser._id.toString() === userId && loggedInUser.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: "Admins cannot delete their own account from this endpoint"
            })
        }

        // Delete profile picture from Cloudinary if exists
        if (user.profilePicPublicId) {
            try {
                const result = await cloudinary.uploader.destroy(user.profilePicPublicId);
                console.log("Cloudinary delete result:", result);

                // Optional: Check if deletion was successful
                if (result.result !== 'ok') {
                    console.warn(`Failed to delete Cloudinary image: ${user.profilePicPublicId}`);
                }
            } catch (cloudinaryError) {
                console.error("Error deleting from Cloudinary:", cloudinaryError);
                // You can decide whether to continue with user deletion
                // or stop here. Usually, we continue as the main entity is the user.
            }
        }

        // Delete the user from database
        const deletedUser = await userModel.findByIdAndDelete(userId);

        // You might also want to clean up related data
        // For example, if user has created posts, orders, etc.
        // await Post.deleteMany({ userId: userId });
        // await Order.deleteMany({ userId: userId });

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            deletedUser: {
                id: deletedUser._id,
                email: deletedUser.email,
                firstName: deletedUser.firstName,
                lastName: deletedUser.lastName
            }
        })

    } catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

module.exports = { register, deleteUserById }