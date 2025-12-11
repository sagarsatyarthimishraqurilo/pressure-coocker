const express = require("express");
const connectDB = require("./database/db");
const app = express();
require('dotenv').config();
const userRoute = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const cors = require('cors');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userAddress = require('./routes/addressRoutes')


const port = process.env.PORT || 3003;

//Json and mulitpar setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

//Enabling cors policy at backend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
//User Routes
app.use('/api/v1/user', userRoute)

//Admin Routes
app.use('/api/v1/admin', adminRoutes)

//Vendor Routes
app.use('/api/v1/vendor', vendorRoutes)

//Product Routes
app.use('/api/v1/product', productRoutes);

//Category Routes
app.use('/api/v1/category', categoryRoutes);

//User Address Routes
app.use('/api/v1/address', userAddress);


app.get("/", (req, res) => {
  res.send("Server is running...");
});

async function StartServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
  });
};

StartServer();
