const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyEmail = require('../emailVerify/verifyEmail');

const register = async (req, res)=>{
    try {
        const {firstName, lastName, email, password} = req.body;
        if(!firstName || !lastName || !email || !password){
            res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const user = await userModel.findOne({email})
        if (user){
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
        const token = jwt.sign({userId: newUser._id}, process.env.JWT_SECRET, {expiresIn: '10m'});
        await verifyEmail(email, token); //send email to user for verification
        newUser.token = token;
        await newUser.save();

        return res.status(201).json({
            success: true,
            message: "User register successfully",
            Data: {
                items:[newUser]
            }
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

const verify = async (req, res)=>{
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
            res.status(400).json({
                success: false,
                message: 'Authorization token is missing or invalid'
            })
        }
        const token = authHeader.split(" ")[1]// Brearer {Token}
        let decoded;
        try{
            decoded = jwt.verify(token, process.env.JWT_SECRET)
        }
        catch(error){
            if(error.name === "TokenExpiredError"){
                return res.status(400).json({
                    success:false,
                    message: "The Registration token has expired"
                })
            }
            return res.status(400).json({
                uccess:false,
                message: "Token Verification failed"
            })
        }

        const user = await userModel.findById(decoded.userId);
        if(!user){
            return res.status(400).json({
                success: false,
                message: "User Not found"
            })
        }
        user.token = null;
        user.isVerified= true;
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

const reVerify = async(req, res)=>{
    try {
        const {email} = req.body;
        const user = await userModel.findOne({email})
        if(!user){
            return res.status(400).json({
                success: false,
                message: "User not found.."
            })
        }
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: '10m'})
        verifyEmail(email, token);
        user.token=token;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Email Sent Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

module.exports = {register, verify}