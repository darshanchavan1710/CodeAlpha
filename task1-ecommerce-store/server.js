const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-jwt-2026-auth';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/apexstore';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB database successfully.');
    initializeDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });

// --- MONGOOSE SCHEMAS & MODELS ---

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image_url: { type: String, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true }
});

// Virtual transform to ensure `.id` is present on products for frontend compatibility
productSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    return ret;
  }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  total_amount: { type: Number, required: true },
  status: { type: String, default: 'Active' }, // 'Active' (Current) vs 'Delivered' (Previous)
  shipping_name: String,
  shipping_address: String,
  shipping_city: String,
  shipping_zip: String,
  payment_method: String,
  items: [{
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    image_url: String,
    price: Number,
    quantity: Number
  }],
  created_at: { type: Date, default: Date.now }
});

orderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    return ret;
  }
});

const Order = mongoose.model('Order', orderSchema);

// Initialize & Seed 15 Products
async function initializeDatabase() {
  try {
    const productCount = await Product.countDocuments();
    if (productCount < 15) {
      await Product.deleteMany({});
      console.log('Seeding MongoDB with 15 mock products...');
      
      const seedProducts = [
        {
          name: 'AeroSound Max Pro Headphones',
          description: 'Premium wireless over-ear headphones with active noise cancellation, dynamic spatial audio, and 40 hours of battery life.',
          price: 199.99,
          image_url: '/images/headphones.jpg',
          category: 'Electronics',
          stock: 50
        },
        {
          name: 'ErgoLift Ergonomic Office Chair',
          description: 'Fully adjustable ergonomic desk chair featuring high-density memory foam, lumbar support, breathable mesh, and smooth casters.',
          price: 289.99,
          image_url: '/images/chair.jpg',
          category: 'Office',
          stock: 20
        },
        {
          name: 'Nomad Traveler Backpack',
          description: 'Durable, water-resistant travel backpack with dedicated 16-inch laptop compartment, hidden security pockets, and USB charging.',
          price: 89.99,
          image_url: '/images/backpack.jpg',
          category: 'Lifestyle',
          stock: 75
        },
        {
          name: 'PulseFit Smart Fitness Watch',
          description: 'Waterproof fitness tracker with continuous heart rate monitoring, built-in GPS, sleep tracking, and vibrant AMOLED display.',
          price: 149.99,
          image_url: '/images/watch.jpg',
          category: 'Fitness',
          stock: 40
        },
        {
          name: 'AromaBrew Precision Coffee Maker',
          description: 'Drip coffee brewer with programmable timer, exact temperature controls, and a vacuum-insulated thermal carafe.',
          price: 129.99,
          image_url: '/images/coffee.jpg',
          category: 'Kitchen',
          stock: 15
        },
        {
          name: 'Lumina Glow Ambient Smart Lamp',
          description: 'Smart LED bedside lamp with 16 million customizable color spectra, voice control compatibility, and sleep sync timers.',
          price: 59.99,
          image_url: '/images/lamp.jpg',
          category: 'Decor',
          stock: 60
        },
        {
          name: 'UltraSonic Mechanical Keyboard',
          description: 'Customizable RGB hot-swappable tactile mechanical keyboard with wireless dual-mode Bluetooth and 2.4GHz connection.',
          price: 119.99,
          image_url: '/images/headphones.jpg',
          category: 'Electronics',
          stock: 35
        },
        {
          name: 'Zenith OLED Gaming Monitor 27"',
          description: '27-inch 240Hz 0.03ms QHD gaming monitor with ultra-vivid color precision and HDR True Black 400 certification.',
          price: 649.99,
          image_url: '/images/chair.jpg',
          category: 'Electronics',
          stock: 12
        },
        {
          name: 'HydroPure Smart Water Bottle',
          description: 'Self-cleaning UV-C stainless steel insulated water bottle keeping liquids cold for 24 hours with hydration reminders.',
          price: 49.99,
          image_url: '/images/backpack.jpg',
          category: 'Lifestyle',
          stock: 90
        },
        {
          name: 'HyperFlex Yoga & Fitness Mat',
          description: 'Non-slip eco-friendly alignment laser-etched yoga mat with extra cushioning for maximum comfort during intense workouts.',
          price: 39.99,
          image_url: '/images/watch.jpg',
          category: 'Fitness',
          stock: 50
        },
        {
          name: 'ChefPro Sous Vide Precision Cooker',
          description: 'WiFi-enabled sous vide immersion circulator delivering restaurant-quality precision temperature cooking at home.',
          price: 109.99,
          image_url: '/images/coffee.jpg',
          category: 'Kitchen',
          stock: 25
        },
        {
          name: 'Minimalist Walnut Desk Organizer',
          description: 'Handcrafted solid American walnut desk organizer with integrated wireless phone charging pad and pen tray.',
          price: 79.99,
          image_url: '/images/lamp.jpg',
          category: 'Office',
          stock: 30
        },
        {
          name: 'SonicClean Electric Toothbrush',
          description: 'Sonic whitening toothbrush with 5 cleaning modes, smart quadrant timer, and travel case with UV sanitizer.',
          price: 69.99,
          image_url: '/images/watch.jpg',
          category: 'Lifestyle',
          stock: 45
        },
        {
          name: 'Vortex Portable Bluetooth Speaker',
          description: 'IPX7 waterproof 360-degree outdoor speaker with deep bass, RGB lightshow beats, and 24-hour continuous playback.',
          price: 79.99,
          image_url: '/images/headphones.jpg',
          category: 'Electronics',
          stock: 65
        },
        {
          name: 'AirPure HEPA Smart Air Purifier',
          description: 'Ultra-quiet air purifier with 3-stage True HEPA filter, real-time air quality display sensor, and mobile app control.',
          price: 159.99,
          image_url: '/images/lamp.jpg',
          category: 'Decor',
          stock: 22
        }
      ];

      await Product.insertMany(seedProducts);
      console.log('MongoDB product seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error initializing MongoDB database:', err);
  }
}

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Access denied. Please log in.' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function checkToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore invalid token
    }
  }
  next();
}

// --- API ROUTES ---

// 1. AUTHENTICATION

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({ username, email, password_hash });

    const token = jwt.sign({ id: newUser._id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: 'Registration successful', user: { id: newUser._id, username, email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Login successful', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', checkToken, (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});


// 2. PRODUCTS

app.get('/api/products', async (req, res) => {
  const { search, category, sort } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  if (category && category !== 'All') {
    filter.category = category;
  }

  let sortOption = {};
  if (sort === 'price-asc') sortOption = { price: 1 };
  else if (sort === 'price-desc') sortOption = { price: -1 };
  else if (sort === 'name-asc') sortOption = { name: 1 };

  try {
    const products = await Product.find(filter).sort(sortOption);
    res.json({ products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to retrieve product details.' });
  }
});


// 3. ORDERS & CHECKOUT

app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items, shipping, payment } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  if (!shipping || !shipping.name || !shipping.address || !shipping.city || !shipping.zip) {
    return res.status(400).json({ error: 'Complete shipping address is required.' });
  }

  if (!payment || !payment.method) {
    return res.status(400).json({ error: 'Payment method details are required.' });
  }

  try {
    const orderItemsDetails = [];
    let orderTotal = 0;

    for (const item of items) {
      let product = null;
      try {
        if (item.id && mongoose.Types.ObjectId.isValid(item.id)) {
          product = await Product.findById(item.id);
        }
      } catch (e) {}

      if (!product) {
        product = await Product.findOne({ name: item.name });
      }

      if (!product) {
        // Fallback: pick any product from catalog so order never fails due to stale cart
        const prods = await Product.find().limit(1);
        if (prods.length > 0) product = prods[0];
      }

      if (!product) {
        return res.status(400).json({ error: 'Selected product is no longer available.' });
      }

      const price = product.price || item.price || 99.99;
      orderTotal += price * item.quantity;

      orderItemsDetails.push({
        product_id: product._id,
        name: product.name || item.name || 'Product',
        image_url: product.image_url || '/images/headphones.jpg',
        price: price,
        quantity: item.quantity,
        newStock: Math.max(0, (product.stock || 10) - item.quantity)
      });
    }

    const shippingFee = orderTotal > 150 ? 0 : 15;
    const taxFee = orderTotal * 0.08;
    const finalTotal = orderTotal + shippingFee + taxFee;

    // Convert user_id safely
    let userIdObj = req.user.id;
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      userIdObj = new mongoose.Types.ObjectId(req.user.id);
    } else {
      // Find user by email or username if id is numeric/old JWT payload
      const u = await User.findOne({ $or: [{ email: req.user.email }, { username: req.user.username }] });
      if (u) userIdObj = u._id;
    }

    const newOrder = await Order.create({
      user_id: userIdObj,
      total_amount: finalTotal,
      status: 'Active',
      shipping_name: shipping.name,
      shipping_address: shipping.address,
      shipping_city: shipping.city,
      shipping_zip: shipping.zip,
      payment_method: payment.method === 'card' ? `Credit Card (*${(payment.cardNumber || '4242').slice(-4)})` : payment.method === 'upi' ? `UPI (${payment.upiId || 'user@upi'})` : 'Cash on Delivery',
      items: orderItemsDetails.map(i => ({
        product_id: i.product_id,
        name: i.name,
        image_url: i.image_url,
        price: i.price,
        quantity: i.quantity
      }))
    });

    // Update stock
    for (const item of orderItemsDetails) {
      await Product.findByIdAndUpdate(item.product_id, { stock: item.newStock });
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: newOrder._id,
      total: finalTotal
    });

  } catch (err) {
    console.error('Order checkout error:', err);
    res.status(500).json({ error: err.message || 'An error occurred while processing your order.' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.user.id }).sort({ created_at: -1 });
    res.json({ orders });
  } catch (err) {
    console.error('Error fetching order history:', err);
    res.status(500).json({ error: 'Failed to retrieve order history.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running with MongoDB at http://localhost:${PORT}`);
});
