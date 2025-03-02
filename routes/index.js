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

    // Fetch products from the database
    const products = await Product.find();

    res.render('index', {
      success,
      error,
      user: req.session.user || null,
      products, // Pass products to the view
    });
  } catch (err) {
    console.error('Error fetching products:', err);

    res.render('index', {
      success: req.flash('success'),
      error: req.flash('error'),
      user: req.session.user || null,
      products: [], // Pass an empty array if there's an error
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
router.post(
  '/uploadProduct',
  isAdminLoggedIn,
  upload.single('image'),
  async (req, res) => {
    const { name, category, description } = req.body;

    try {
      const newProduct = new Product({
        productID: uuidv4(), // Generate unique product ID
        name,
        image: req.file ? `/uploads/${req.file.filename}` : '', // Store image path
        category,
        description,
      });

      await newProduct.save();
      req.flash('success', 'Product uploaded successfully!');
      res.redirect('/adminDashboard');
    } catch (err) {
      console.error('Error uploading product:', err);
      req.flash('error', 'Failed to upload product. Try again!');
      res.redirect('/adminDashboard');
    }
  }
);

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
router.get('/adminDashboard', isAdminLoggedIn, async (req, res) => {
  try {
    const products = await Product.find();
    res.render('admin/adminDashboard', { products }); // Passing products to the view
  } catch (err) {
    console.error('Error fetching products:', err);
    res.render('admin/adminDashboard', { products: [] }); // Pass empty array in case of error
  }
});

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

/* ===========================
        Logout Routes
   =========================== */

// User Logout (GET)
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/userLogin');
  });
});

// Admin Logout (GET)
router.get('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
      return res.redirect('/adminDashboard');
    }
    res.clearCookie('connect.sid');
    res.redirect('/adminLogin');
  });
});

module.exports = router;
