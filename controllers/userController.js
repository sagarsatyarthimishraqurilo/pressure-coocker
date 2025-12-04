const userModel = require('../models/user.models');
const bcrypt = require('bcrypt');


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

module.exports = register