// scripts/migrate-add-blocked.js
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../database/db');
const userModel = require('../models/user.models');

(async function main(){
  await connectDB();
  console.log("Connected");
  // set undefined isBlocked to false
  await userModel.updateMany({ isBlocked: { $exists: false } }, { $set: { isBlocked: false }});
  console.log("Backfilled isBlocked");

  // ensure vendors have vendor role and others ok (optional)
  // await userModel.updateMany({ role: null }, { $set: { role: 'user' }});

  console.log("Done");
  process.exit(0);
})();
