var express = require('express');
var router = express.Router();
const mongoose = require('../db/db');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

// Check wheather the user is logged in or not...
isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in first');
  res.redirect('/userLogin');
};

// Home GET Route
router.get('/', isLoggedIn, function (req, res, next) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('index', { success, error });
});

// Products Upload Route
router.get('/prodUpload', function (req, res) {
  res.render('products/productsUpload');
});

// User Routes
router.get('/userLogin', function (req, res, next) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('user/userLogin', { success, error });
});

router.get('/userRegister', function (req, res, next) {
  const success = req.flash('success');
  const error = req.flash('error');
  res.render('user/userRegister', { success, error });
});

// Register User (POST)
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    req.flash('error', 'Username already exists');
    return res.redirect('/userRegister');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ name, username, email, password: hashedPassword });

  await newUser.save();

  req.flash('success', 'Registration successful! Please log in.');
  res.redirect('/userLogin');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Find user in the database
  const user = await User.findOne({ username });

  if (!user) {
    req.flash('error', 'Invalid Username or Password');
    return res.redirect('/userLogin');
  }

  // Compare entered password with stored hashed password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    req.flash('error', 'Invalid Username or Password');
    return res.redirect('/userLogin');
  }

  // If login is successful, store user session
  req.session.user = { id: user._id, username: user.username };
  req.flash('success', 'Login successful!');
  res.redirect('/');
});

// Admin Routes
router.get('/adminLogin', function (req, res) {
  res.render('admin/adminLogin');
});

router.get('/adminRegister', function (req, res) {
  res.render('admin/adminRegister');
});

// Logout Route for User
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

module.exports = router;
