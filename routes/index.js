var express = require('express');
var router = express.Router();
const mongoose = require('../db/db');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Admin = require('../models/admin.model');
const Product = require('../models/products.model');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Configure Storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Store images in public/uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Rename file
  },
});

const upload = multer({ storage: storage });

// Middleware: Check if User is Logged In
const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in first');
  res.redirect('/userLogin');
};

// Middleware: Check if Admin is Logged In
const isAdminLoggedIn = (req, res, next) => {
  if (req.session.admin) {
    return next();
  }
  req.flash('error_msg', 'Please log in as Admin');
  res.redirect('/adminLogin');
};

/* ===========================
        Home Route (GET)
   =========================== */
router.get('/', isLoggedIn, async function (req, res, next) {
  try {
    const success = req.flash('success');
    const error = req.flash('error');

    // Ensure cart is initialized in session
    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Fetch products from the database
    const products = await Product.find();

    res.render('index', {
      success,
      error,
      user: req.session.user || null,
      products,
      cart: req.session.cart, // Pass cart to EJS
    });
  } catch (err) {
    console.error('Error fetching products:', err);

    res.render('index', {
      success: req.flash('success'),
      error: req.flash('error'),
      user: req.session.user || null,
      products: [],
      cart: [], // Ensure cart is always defined
    });
  }
});

/* ===========================
        Product Upload (GET)
   =========================== */
router.get('/prodUpload', function (req, res) {
  res.render('products/productsUpload');
});

/* ===========================
        Product Upload (POST)
   =========================== */
/* ===========================
        Product Upload (POST)
   =========================== */
// router.post(
//   '/uploadProduct',
//   isAdminLoggedIn,
//   upload.single('image'),
//   async (req, res) => {
//     const { name, price, description } = req.body;

//     try {
//       const newProduct = new Product({
//         productID: uuidv4(),
//         name,
//         image: `/uploads/${req.file.filename}`,
//         price, // Changed from category to price
//         description,
//       });

//       await newProduct.save();
//       req.flash('success', 'Product uploaded successfully!');
//       res.redirect('/adminDashboard');
//     } catch (err) {
//       console.error('Error uploading product:', err);
//       req.flash('error', 'Failed to upload product. Try again!');
//       res.redirect('/adminDashboard');
//     }
//   }
// );

/* ===========================
        User Authentication Routes
   =========================== */

// User Login Page (GET)
router.get('/userLogin', function (req, res) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('user/userLogin', { success, error });
});

// User Register Page (GET)
router.get('/userRegister', function (req, res) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('user/userRegister', { success, error });
});

// Register User (POST)
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      req.flash('error', 'Username already exists');
      return res.redirect('/userRegister');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/userLogin');
  } catch (err) {
    console.error('User registration error:', err);
    req.flash('error', 'Something went wrong, please try again.');
    res.redirect('/userRegister');
  }
});

// User Login (POST)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      req.flash('error', 'Invalid Username or Password');
      return res.redirect('/userLogin');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.flash('error', 'Invalid Username or Password');
      return res.redirect('/userLogin');
    }

    req.session.user = { id: user._id, username: user.username };

    req.flash('success', 'Login successful!');
    res.redirect('/');
  } catch (err) {
    console.error('User login error:', err);
    req.flash('error', 'Something went wrong, please try again.');
    res.redirect('/userLogin');
  }
});

/* ===========================
        Admin Authentication Routes
   =========================== */

// Admin Login Page (GET)
router.get('/adminLogin', function (req, res) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('admin/adminLogin', { success, error });
});

// Admin Register Page (GET)
router.get('/adminRegister', function (req, res) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('admin/adminRegister', { success, error });
});

// Admin Register (POST)
router.post('/admin/register', async (req, res) => {
  const { name, adminUserName, adminId, email, password } = req.body;

  try {
    const existingAdmin = await Admin.findOne({
      $or: [{ adminUserName }, { adminId }],
    });

    if (existingAdmin) {
      req.flash('error', 'Admin username or ID is already taken.');
      return res.redirect('/adminRegister');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      adminUserName,
      adminId,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();

    req.flash('success', 'Admin registered successfully! Please log in.');
    res.redirect('/adminLogin');
  } catch (err) {
    console.error('Admin registration error:', err);
    req.flash('error', 'Something went wrong, please try again.');
    res.redirect('/adminRegister');
  }
});

// Admin Dashboard (GET)
router.get('/adminDashboard', isAdminLoggedIn, async (req, res) => {
  try {
    if (!req.session.admin) {
      req.flash('error', 'Admin session not found. Please log in again.');
      return res.redirect('/admin/login'); // Redirect to login page
    }

    const products = await Product.find({ adminId: req.session.admin.id });

    res.render('admin/adminDashboard', {
      products,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    req.flash('error', 'Something went wrong while fetching products.');
    res.redirect('/adminDashboard');
  }
});

// Upload Product (POST)
router.post(
  '/uploadProduct',
  isAdminLoggedIn,
  upload.single('image'),
  async (req, res) => {
    const { name, price, description } = req.body;

    if (!req.file) {
      req.flash('error', 'Please upload an image');
      return res.redirect('/adminDashboard');
    }

    try {
      const newProduct = new Product({
        productID: uuidv4(),
        name,
        image: `/uploads/${req.file.filename}`,
        price,
        description,
        adminId: req.session.admin.id,
      });

      await newProduct.save();
      req.flash('success', 'Product uploaded successfully!');
    } catch (err) {
      console.error('Error uploading product:', err);
      req.flash('error', 'Failed to upload product. Try again!');
    }
    res.redirect('/adminDashboard');
  }
);

// Admin Login (POST)
router.post('/admin/login', async (req, res) => {
  const { adminId, adminUserName, password } = req.body;

  try {
    const admin = await Admin.findOne({ adminId, adminUserName });

    if (!admin) {
      req.flash('error', 'Invalid Admin ID, Username, or Password');
      return res.redirect('/adminLogin');
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      req.flash('error', 'Invalid Admin ID, Username, or Password');
      return res.redirect('/adminLogin');
    }

    req.session.admin = { id: admin._id, adminUserName: admin.adminUserName };

    req.flash('success', 'Welcome, Admin!');
    res.redirect('/adminDashboard');
  } catch (err) {
    console.error('Admin login error:', err);
    req.flash('error', 'Something went wrong, please try again.');
    res.redirect('/adminLogin');
  }
});

// Cart Page
router.get('/cart', (req, res) => {
  res.render('cart', { cart: req.session.cart });
});

// Add product to cart
router.post('/add-to-cart', async (req, res) => {
  const { productID } = req.body;
  const product = await Product.findOne({ productID });

  if (!product) {
    req.flash('error_msg', 'Product not found.');
    return res.redirect('/');
  }

  let cart = req.session.cart;
  let existingProduct = cart.find(item => item.productID === productID);

  if (existingProduct) {
    existingProduct.quantity += 1;
  } else {
    cart.push({ ...product.toObject(), quantity: 1 });
  }

  req.session.cart = cart;
  res.redirect('/cart');
});

// Increase quantity
router.post('/increase/:id', (req, res) => {
  let cart = req.session.cart;
  let product = cart.find(item => item.productID === req.params.id);

  if (product) {
    product.quantity += 1;
  }
  res.redirect('/cart');
});

// Decrease quantity
router.post('/decrease/:id', (req, res) => {
  let cart = req.session.cart;
  let product = cart.find(item => item.productID === req.params.id);

  if (product) {
    product.quantity -= 1;
    if (product.quantity <= 0) {
      req.session.cart = cart.filter(item => item.productID !== req.params.id);
    }
  }
  res.redirect('/cart');
});

// Remove item
router.post('/remove/:id', (req, res) => {
  req.session.cart = req.session.cart.filter(
    item => item.productID !== req.params.id
  );
  res.redirect('/cart');
});

/* ===========================
        Logout Routes
   =========================== */
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.clearCookie('connect.sid');
    res.redirect('/userLogin');
  });
});

router.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.clearCookie('connect.sid');
    res.redirect('/adminLogin');
  });
});

module.exports = router;
