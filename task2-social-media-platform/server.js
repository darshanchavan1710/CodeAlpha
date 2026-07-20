const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'social-secret-key-for-jwt-2026-auth';

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
    // 1. Create Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '/images/avatar_default.jpg',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Posts Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 3. Create Comments Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 4. Create Likes Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS likes (
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // 5. Create Follows Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users (id),
        FOREIGN KEY (following_id) REFERENCES users (id)
      )
    `);

    // Seed mock data if database is empty
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding database with mock social data...');
      
      // Hash password for seed users (password will be 'password123')
      const salt = await bcrypt.genSalt(10);
      const passHash = await bcrypt.hash('password123', salt);

      // Insert Seed Users
      const u1 = await dbRun(
        'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
        ['aurora_coder', 'aurora@example.com', passHash, 'Fullstack developer shaping the digital sunrise. Coffee enthusiast, tech writer.', '/images/avatar_aurora.jpg']
      );
      const u2 = await dbRun(
        'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
        ['pixel_pioneer', 'pixel@example.com', passHash, 'Creative designer playing with lights, shadows, and coordinates. Pixel art lover.', '/images/avatar_pixel.jpg']
      );
      const u3 = await dbRun(
        'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
        ['fitness_runner', 'fitness@example.com', passHash, 'Marathoner and health coach. Transforming lives one stride at a time.', '/images/avatar_fitness.jpg']
      );

      // Insert Seed Posts
      const p1 = await dbRun(
        'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
        [u1.lastID, 'Just launched my new open-source library for UI layouts! Clean code makes my heart beat faster.', '/images/post_code.jpg']
      );
      const p2 = await dbRun(
        'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
        [u2.lastID, 'Loving the new glassmorphism design trend in web interfaces. It adds a sleek premium feel. What do you think?', '/images/post_design.jpg']
      );
      const p3 = await dbRun(
        'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
        [u3.lastID, 'Morning run completed! 10k in the bags. Early bird gets the worm! Let\'s stay active.', '/images/post_run.jpg']
      );

      // Insert Seed Comments
      await dbRun(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [p1.lastID, u2.lastID, 'Wow, this looks super clean! Definitely checking out the repository. Great job!']
      );
      await dbRun(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [p2.lastID, u1.lastID, 'Absolutely agree! Combining it with soft backing glows creates beautiful layouts.']
      );

      // Insert Seed Likes
      await dbRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [p1.lastID, u2.lastID]);
      await dbRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [p1.lastID, u3.lastID]);
      await dbRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [p2.lastID, u1.lastID]);
      await dbRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [p3.lastID, u1.lastID]);

      // Insert Seed Follows
      await dbRun('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u1.lastID, u2.lastID]); // Aurora follows Pixel
      await dbRun('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u2.lastID, u1.lastID]); // Pixel follows Aurora
      await dbRun('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [u3.lastID, u1.lastID]); // Fitness follows Aurora

      console.log('Seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please login.' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session.' });
  }
}

// Optional Authentication Middleware
function checkToken(req, res, next) {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore
    }
  }
  next();
}

// --- API ENDPOINTS ---

// 1. AUTHENTICATION

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Validate username regex (no spaces)
  const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-15 alphanumeric characters or underscores.' });
  }

  try {
    const existingUser = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const token = jwt.sign({ id: result.lastID, username, email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({ message: 'Register successful', user: { id: result.lastID, username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register account.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.cookie('auth_token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login operation failed.' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

// Me
app.get('/api/auth/me', checkToken, (req, res) => {
  res.json({ user: req.user || null });
});


// 2. USER PROFILES

// Get Profile details
app.get('/api/users/:username', checkToken, async (req, res) => {
  try {
    const targetUser = await dbGet('SELECT id, username, bio, avatar_url, created_at FROM users WHERE username = ?', [req.params.username]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Followers Count
    const followers = await dbGet('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetUser.id]);
    // Following Count
    const following = await dbGet('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [targetUser.id]);

    let isFollowing = false;
    if (req.user) {
      const followCheck = await dbGet('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetUser.id]);
      isFollowing = !!followCheck;
    }

    res.json({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        bio: targetUser.bio,
        avatar_url: targetUser.avatar_url,
        created_at: targetUser.created_at,
        followers_count: followers.count,
        following_count: following.count,
        is_following: isFollowing
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Update Bio
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { bio } = req.body;
  
  if (bio === undefined) {
    return res.status(400).json({ error: 'Bio content is missing.' });
  }

  try {
    await dbRun('UPDATE users SET bio = ? WHERE id = ?', [bio, req.user.id]);
    res.json({ message: 'Profile bio updated successfully', bio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile bio.' });
  }
});

// Get User Recommendations to Follow
app.get('/api/users/recommendations', authenticateToken, async (req, res) => {
  try {
    // Recommend users that the logged-in user is NOT currently following, excluding themselves
    const recommendations = await dbAll(`
      SELECT id, username, bio, avatar_url 
      FROM users 
      WHERE id != ? 
      AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY RANDOM() LIMIT 5
    `, [req.user.id, req.user.id]);

    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve follow recommendations.' });
  }
});


// 3. POSTS

// Get All Posts or Filtered Feed
app.get('/api/posts', checkToken, async (req, res) => {
  const { feed, username } = req.query;

  let query = `
    SELECT p.id, p.content, p.image_url, p.created_at, u.username, u.avatar_url, u.id as user_id,
           (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
           (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
    FROM posts p
    JOIN users u ON p.user_id = u.id
  `;

  const params = [];

  if (feed === 'following') {
    if (!req.user) {
      return res.status(401).json({ error: 'Authorization required for personalized feed.' });
    }
    query += ' WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) ';
    params.push(req.user.id);
  } else if (username) {
    query += ' WHERE u.username = ? ';
    params.push(username);
  }

  query += ' ORDER BY p.created_at DESC ';

  try {
    const posts = await dbAll(query, params);

    // Attach whether current user has liked each post
    const detailedPosts = [];
    for (const post of posts) {
      let userLiked = false;
      if (req.user) {
        const likeCheck = await dbGet('SELECT * FROM likes WHERE post_id = ? AND user_id = ?', [post.id, req.user.id]);
        userLiked = !!likeCheck;
      }
      detailedPosts.push({
        ...post,
        has_liked: userLiked
      });
    }

    res.json({ posts: detailedPosts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve posts.' });
  }
});

// Create Post
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { content, image_url } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.user.id, content, image_url || null]
    );

    const newPost = await dbGet(`
      SELECT p.id, p.content, p.image_url, p.created_at, u.username, u.avatar_url, u.id as user_id
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [result.lastID]);

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...newPost,
        likes_count: 0,
        comments_count: 0,
        has_liked: false
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// Toggle Like
app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    const post = await dbGet('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const likeCheck = await dbGet('SELECT * FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);

    let action = '';
    if (likeCheck) {
      await dbRun('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      action = 'unliked';
    } else {
      await dbRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      action = 'liked';
    }

    const likesCount = await dbGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId]);

    res.json({
      message: `Post ${action} successfully`,
      has_liked: action === 'liked',
      likes_count: likesCount.count
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process like toggle.' });
  }
});


// 4. COMMENTS

// Get Comments for Post
app.get('/api/posts/:id/comments', async (req, res) => {
  const postId = req.params.id;

  try {
    const comments = await dbAll(`
      SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json({ comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve comments.' });
  }
});

// Add Comment
app.post('/api/posts/:id/comments', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Comment content cannot be empty.' });
  }

  try {
    const post = await dbGet('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const result = await dbRun(
      'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
      [postId, req.user.id, content]
    );

    const comment = await dbGet(`
      SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.lastID]);

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});


// 5. FOLLOWS / UNFOLLOWS

// Toggle Follow User
app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.id);
  const followerId = req.user.id;

  if (targetUserId === followerId) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }

  try {
    const targetUser = await dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User to follow not found.' });
    }

    const followCheck = await dbGet('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetUserId]);

    let action = '';
    if (followCheck) {
      await dbRun('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetUserId]);
      action = 'unfollowed';
    } else {
      await dbRun('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [followerId, targetUserId]);
      action = 'followed';
    }

    const followersCount = await dbGet('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [targetUserId]);
    const followingCount = await dbGet('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [followerId]);

    res.json({
      message: `Successfully ${action} user.`,
      is_following: action === 'followed',
      followers_count: followersCount.count,
      following_count: followingCount.count
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle follow status.' });
  }
});



// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
