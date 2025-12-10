const express = require("express");
const connectDB  = require("./database/db");
const app = express();
require('dotenv').config();
const userRoute = require('./routes/userRoutes')
const cors = require('cors')


const port = process.env.PORT || 3003;

//Json and mulitpar setup
app.use(express.json());
app.use(express.urlencoded({extended: true}))

//Enabling cors policy at backend
app.use(cors({
  origin:'http://localhost:5173',
  credentials: true
}))

app.use('/api/v1/user', userRoute)

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
