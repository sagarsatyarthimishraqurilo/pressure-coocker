// scripts/backfill-stockBase.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../database/db'); // your db connector
const Product = require('../models/productModels');
const { toBase } = require('../utils/units');

(async () => {
  try {
    await connectDB();
    console.log("Connected to DB");
    const products = await Product.find();
    let updated = 0;
    for (const p of products) {
      // only backfill when stockBase not present or zero and stock present
      if ((p.stockBase === undefined || p.stockBase === 0) && (p.stock !== undefined)) {
        const disp = p.displayUnit || 'pcs';
        p.stockBase = toBase(Number(p.stock || 0), disp);
        await p.save();
        updated++;
      }
    }
    console.log("Backfill complete. Updated:", updated);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
