const Address = require("../models/address.models");
const axios = require("axios");
const mongoose = require("mongoose");

// Reverse Geocoding using Nominatim (OpenStreetMap) - FREE
// uses axios
// uses axios
const getAddressFromLocation = async (lat, lng) => {
    try {
      if (lat == null || lng == null) return null;
  
      // prefer Nominatim first
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2`;
  
      // build headers: include a sensible User-Agent and contact
      const ua = `PressureCookerApp/1.0 (${process.env.NOMINATIM_EMAIL || 'sagarsatyarthimishraqurilo@gmail.com'})`;
      const referer = process.env.REFERER || 'https://pressurecooker.com';
  
      try {
        const { data } = await axios.get(nominatimUrl, {
          headers: {
            'User-Agent': ua,
            'Referer': referer,
            'Accept-Language': 'en'
          },
          timeout: 5000
        });
  
        if (data && data.address) {
          const addr = data.address;
          return {
            addressLine: data.display_name || "",
            city: addr.city || addr.town || addr.village || addr.hamlet || "",
            state: addr.state || "",
            pincode: addr.postcode || ""
          };
        }
        // if no useful data, fallthrough to fallback
      } catch (nErr) {
        // log Nominatim-specific error (403 etc)
        console.warn("Nominatim error:", nErr.response ? `${nErr.response.status} ${nErr.response.statusText}` : nErr.message);
        // if 403/429 or other, we'll try fallback below (if available)
      }
  
      // Optional fallback: LocationIQ (requires key)
      const locKey = process.env.LOCATIONIQ_KEY;
      if (locKey) {
        try {
          const liUrl = `https://us1.locationiq.com/v1/reverse.php?key=${locKey}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`;
          const { data: liData } = await axios.get(liUrl, { timeout: 5000 });
          if (liData && (liData.address || liData.display_name)) {
            const addr = liData.address || {};
            return {
              addressLine: liData.display_name || "",
              city: addr.city || addr.town || addr.village || addr.county || "",
              state: addr.state || "",
              pincode: addr.postcode || ""
            };
          }
        } catch (liErr) {
          console.warn("LocationIQ error:", liErr.response ? `${liErr.response.status} ${liErr.response.statusText}` : liErr.message);
        }
      }
  
      // nothing worked
      return null;
    } catch (err) {
      console.error("getAddressFromLocation fallback error:", err);
      return null;
    }
  };
  


// Create new address
exports.addAddress = async (req, res) => {
    try {
        const user = req.user;
        const {
            fullName,
            phone,
            addressLine,
            city,
            state,
            pincode,
            latitude,
            longitude,
            addressType
        } = req.body;

        let finalAddress = { addressLine, city, state, pincode };

        // If front-end sends coordinates → Auto-fill using OSM
        if ((!addressLine || !city || !state || !pincode) && latitude != null && longitude != null) {
            const fetched = await getAddressFromLocation(latitude, longitude);
            if (fetched) {
                finalAddress = fetched;
            }
        }

        // If still missing → fallback dummy address
        if (!finalAddress.addressLine) {
            finalAddress = {
                addressLine: "Unknown Street",
                city: "Unknown City",
                state: "Unknown State",
                pincode: "000000"
            };
        }

        // If this is user's first address => mark default
        const existingCount = await Address.countDocuments({ userId: user._id });

        const address = await Address.create({
            userId: user._id,
            fullName,
            phone,
            ...finalAddress,
            latitude,
            longitude,
            addressType,
            isDefault: existingCount === 0
        });

        return res.status(201).json({ success: true, address });
    } catch (err) {
        console.error("addAddress:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Get all addresses
exports.getMyAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
        return res.json({ success: true, addresses });
    } catch (err) {
        console.error("getMyAddresses:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Update address
exports.updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid address id" });
        }
        const user = req.user;

        const address = await Address.findOne({ _id: addressId, userId: user._id });
        if (!address) return res.status(404).json({ success: false, message: "Address not found" });

        // If lat/lng provided and some fields missing, try to autofill
        const { latitude, longitude } = req.body;
        if ((req.body.addressLine == null || req.body.city == null || req.body.state == null || req.body.pincode == null)
            && latitude != null && longitude != null) {
            const fetched = await getAddressFromLocation(latitude, longitude);
            if (fetched) {
                // Only fill missing fields
                req.body.addressLine = req.body.addressLine || fetched.addressLine;
                req.body.city = req.body.city || fetched.city;
                req.body.state = req.body.state || fetched.state;
                req.body.pincode = req.body.pincode || fetched.pincode;
            }
        }

        Object.assign(address, req.body);
        await address.save();

        return res.json({ success: true, address });
    } catch (err) {
        console.error("updateAddress:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Delete address
exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid address id" });
        }

        const deleted = await Address.findOneAndDelete({ _id: addressId, userId: req.user._id });
        if (!deleted) return res.status(404).json({ success: false, message: "Address not found or not yours" });

        // If deleted was default, optionally set another as default
        if (deleted.isDefault) {
            const another = await Address.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
            if (another) {
                another.isDefault = true;
                await another.save();
            }
        }

        return res.json({ success: true, message: "Address deleted" });
    } catch (err) {
        console.error("deleteAddress:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Set default address
exports.setDefaultAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: "Invalid address id" });
        }
        const userId = req.user._id;

        // Ensure the address belongs to user
        const addr = await Address.findOne({ _id: addressId, userId });
        if (!addr) return res.status(404).json({ success: false, message: "Address not found or not yours" });

        await Address.updateMany({ userId }, { $set: { isDefault: false } });
        addr.isDefault = true;
        await addr.save();

        return res.json({ success: true, message: "Default address set", address: addr });
    } catch (err) {
        console.error("setDefaultAddress:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
