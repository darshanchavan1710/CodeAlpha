const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-for-jwt-2026-auth';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Promisified Database Helpers
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// Initialize Schema & Seed Data
async function initializeDatabase() {
  try {
    // Create Users table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Products table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        image_url TEXT NOT NULL,
        category TEXT NOT NULL,
        stock INTEGER NOT NULL
      )
    `);

    // Create Orders table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create Order Items table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Seed mock products if none exist
    const productCount = await dbGet('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
      console.log('Seeding database with mock products...');
      const seedProducts = [
        {
          name: 'AeroSound Max Pro Headphones',
          description: 'Premium wireless over-ear headphones with active noise cancellation, dynamic bass, and 40 hours of battery life.',
          price: 199.99,
          image_url: '/images/headphones.jpg',
          category: 'Electronics',
          stock: 50
        },
        {
          name: 'ErgoLift Ergonomic Office Chair',
          description: 'Fully adjustable ergonomic desk chair featuring high-density foam, lumbar support, breathable mesh, and smooth-rolling casters.',
          price: 289.99,
          image_url: '/images/chair.jpg',
          category: 'Office',
          stock: 20
        },
        {
          name: 'Nomad Traveler Backpack',
          description: 'Durable, water-resistant travel backpack with a dedicated 16-inch laptop compartment, hidden pockets, and USB charging port.',
          price: 89.99,
          image_url: '/images/backpack.jpg',
          category: 'Lifestyle',
          stock: 75
        },
        {
          name: 'PulseFit Smart Fitness Watch',
          description: 'Waterproof fitness tracker with continuous heart rate monitoring, built-in GPS, sleep tracking, and a bright AMOLED display.',
          price: 149.99,
          image_url: '/images/watch.jpg',
          category: 'Fitness',
          stock: 40
        },
        {
          name: 'AromaBrew Precision Coffee Maker',
          description: 'Drip coffee brewer with programmable timer, temperature controls, and a vacuum-insulated thermal carafe.',
          price: 129.99,
          image_url: '/images/coffee.jpg',
          category: 'Kitchen',
          stock: 15
        },
        {
          name: 'Lumina Glow Ambient Smart Lamp',
          description: 'Smart LED bedside lamp with 16 million customizable colors, voice control compatibility, and customizable sleep timers.',
          price: 59.99,
          image_url: '/images/lamp.jpg',
          category: 'Decor',
          stock: 60
        }
      ];

      for (const prod of seedProducts) {
        await dbRun(
          'INSERT INTO products (name, description, price, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?)',
          [prod.name, prod.description, prod.price, prod.image_url, prod.category, prod.stock]
        );
      }
      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Authentication Middleware
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

// Optional Auth Middleware that doesn't block request but attaches user if present
function checkToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore invalid token, just treat as guest
    }
  }
  next();
}

// --- API ROUTES ---

// 1. AUTHENTICATION

// User Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Generate JWT
    const token = jwt.sign({ id: result.lastID, username, email }, JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({ message: 'Registration successful', user: { id: result.lastID, username, email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find user
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// User Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Get Current User Profile
app.get('/api/auth/me', checkToken, (req, res) => {
  if (req.user) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});


// 2. PRODUCTS

// Get All Products
app.get('/api/products', async (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM products';
  const params = [];

  const conditions = [];
  if (search) {
    conditions.push('(name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category && category !== 'All') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const products = await dbAll(query, params);
    res.json({ products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

// Get Single Product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
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

// Place Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items } = req.body; // Array of { id, quantity }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  try {
    // 1. Validate stock and calculate total price
    const orderItemsDetails = [];
    let orderTotal = 0;

    for (const item of items) {
      const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.id]);
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${item.id} not found.` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Only ${product.stock} units available.` });
      }

      const itemTotal = product.price * item.quantity;
      orderTotal += itemTotal;

      orderItemsDetails.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        newStock: product.stock - item.quantity
      });
    }

    // 2. Insert order
    const orderResult = await dbRun(
      'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
      [req.user.id, orderTotal, 'Processing']
    );
    const orderId = orderResult.lastID;

    // 3. Insert items and update stock
    for (const item of orderItemsDetails) {
      // Insert item
      await dbRun(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Update product stock
      await dbRun(
        'UPDATE products SET stock = ? WHERE id = ?',
        [item.newStock, item.product_id]
      );
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      total: orderTotal
    });

  } catch (err) {
    console.error('Order checkout error:', err);
    res.status(500).json({ error: 'An error occurred while processing your order.' });
  }
});

// Retrieve Order History for Logged-in User
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await dbAll(
      'SELECT id, total_amount, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    const detailedOrders = [];
    for (const order of orders) {
      const items = await dbAll(`
        SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name, p.image_url 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      detailedOrders.push({
        ...order,
        items
      });
    }

    res.json({ orders: detailedOrders });
  } catch (err) {
    console.error('Error fetching order history:', err);
    res.status(500).json({ error: 'Failed to retrieve order history.' });
  }
});



// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
