const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    productName: {
        type: String,
        required: true,
    },
    productDescription: {
        type: String,
        required: true,
    },
    productImage: [
        {
            url: {
                type: String
            },
            publicId: { type: String, required: true }
        }
    ],
    productPrice: {
        type: Number
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref:""
    },
    brand:{
        type: String
    }
},{timestamps:true})

const Product = mongoose.model("Product", productSchema);