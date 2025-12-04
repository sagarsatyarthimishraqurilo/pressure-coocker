const mongoose = require('mongoose');

const connectDB = async()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/pressure-cooker`);
        console.log("MongoDB connected successfully!!");
        
    } catch (error) {
        console.log("MongoDB connection error: ", error);
        
    }
}

module.exports = connectDB;