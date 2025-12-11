
# ✅ **Completed Functionality Summary**

## **User**

* User Registration
* Email Verification
* Re-Verification (resend verify link)
* User Login
* Logout
* Forgot Password (OTP send)
* Verify OTP
* Change Password
* Get Profile
* Update Profile (with image upload)
* Get User by ID

---

## **Vendor**

* Vendor Registration
* Vendor Login (same login API)
* Create Product (with multiple images)
* Update Product (add/remove images, update details)
* Delete Product (soft delete)
* List My Products
* Stock Management (adjust stock, decrement stock)
* Unit System added (kg/g/l/ml/pcs)

---

## **Admin**

* Admin Registration
* Admin Login
* Get All Users
* Get User by ID
* Delete User
* Block / Unblock Vendor
* List Users by Role
* List Vendors with Their Products

---

## **Category**

* Create Category (with image + icon)
* Update Category
* Delete Category (with product reassignment)
* Get Category List (dropdown API)
* Get Category by ID

---

## **Product (Public)**

* List All Products (with search, price filter, pagination)
* Get Product by ID
* List Products by Category
* List Products by Vendor
* All product listings exclude blocked vendors
* All product responses return human-readable stock (converted units)

---

## **System / Utilities**

* Role-based Access (`isAuthenticated`, `isAdmin`, `isVendor`)
* Cloudinary Image Uploads
* Multer for file handling
* Session model for login tracking
* Text Search on products

---

## **Address** 

* User can add address through google currentlocation
* User can get their all address
* User can delete their address
* User can update their address
* User can set default their address

---