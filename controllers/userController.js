const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyEmail = require('../emailVerify/verifyEmail');
const session = require('../models/sessionModel');
const { use } = require('../routes/userRoutes');
const sendOTPMail = require('../emailVerify/sentOTPMail')

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
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
        await verifyEmail(email, token); //send email to user for verification
        newUser.token = token;
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

const verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(400).json({
                success: false,
                message: 'Authorization token is missing or invalid'
            })
        }
        const token = authHeader.split(" ")[1]// Brearer {Token}
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        }
        catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(400).json({
                    success: false,
                    message: "The Registration token has expired"
                })
            }
            return res.status(400).json({
                uccess: false,
                message: "Token Verification failed"
            })
        }

        const user = await userModel.findById(decoded.userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not found"
            })
        }
        user.token = null;
        user.isVerified = true;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const reVerify = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found.."
            })
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' })
        verifyEmail(email, token);
        user.token = token;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Verification email sent again successfully",
            token: token
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not exist"
            })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Password is invalid"
            })
        }
        if (user.isVerified === false) {
            return res.status(400).json({
                success: false,
                message: "Verify your account then login"
            })
        }

        // Generat token
        const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10d' })
        const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' })

        user.isLoggedIn = true;
        await user.save();

        // CHeck for existing session and deleting
        const existingSession = await session.findOne({ userId: user._id });
        if (existingSession) {
            await session.deleteOne({ userId: user._id })
        }

        //Create a new session
        await session.create({
            userId: user._id
        })
        return res.status(200).json({
            success: true,
            message: `Welcome back ${user.firstName}`,
            user: user,
            accessToken,
            refreshToken
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const logout = async (req, res) => {
    try {
        const userId = req.id;
        // 1. सभी सेशन डिलीट करें (एक यूजर के कई सेशन हो सकते हैं)
        await session.deleteMany({ userId: userId });
        await userModel.findByIdAndUpdate(userId, { isLoggedIn: false })
        return res.status(200).json({
            success: true,
            message: "User logged Out successfully",
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email: email });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) //10 min
        user.otp = otp;
        user.otpExpiry = otpExpiry

        await user.save();
        await sendOTPMail(otp, email);

        return res.status(200).json({
            success: true,
            message: "Otp sent to email successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const ResetPassword = async (req, res) => {
    try {
        const otp = req.body.otp;
        const email = req.params.email
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is required"
            })
        }
        const user = await userModel.findOne({ email: email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP is not generated or already verified"
            })
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({
                success: true,
                message: "OTP has expired, Please request a new one"
            })
        }

        if (otp != user.otp) {
            return res.status(400).json({
                success: false,
                message: `OTP is invalid`
            })
        }

        user.otp = null;
        user.otpExpiry = null;
        user.otpVerified = true
        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP verified Successfull"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const changePassowrd = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const { email } = req.params;
        const user = await userModel.findOne({ email: email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "new Password and confirm password are not matched"
            })
        }
        if (!user.otpVerified) {
            return res.status(400).json({
                success: false,
                message: "OTP is not verified!, First verify OTP"
            })
        }

        const hashPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashPassword;
        user.otpVerified = false;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password change successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const getAllUser = async (_, res,) => {
    try {
        const user = await userModel.find();
        return res.status(200).json({
            success: true,
            user: user
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })

    }
}

const getUserByID = async (req, res) => {
    try {
        const {userId} = req.params; //Extract useriD from request params
        const user = await userModel.findById(userId).select("-password -otp -otpExpiry -token -otpVerified")
        if(!user){
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        return res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

module.exports = { register, verify, reVerify, login, logout, forgotPassword, ResetPassword, changePassowrd, getAllUser, getUserByID }