const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Vercel Postgres
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

// Create users table if it doesn't exist
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS pet_advocates (
      id SERIAL PRIMARY KEY,
      firstName VARCHAR(100),
      lastName VARCHAR(100),
      address VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      username VARCHAR(100) UNIQUE,
      password TEXT,
      role VARCHAR(50) DEFAULT 'pet-advocate',
      onboarding JSONB DEFAULT '{}'::jsonb
    );
  `;
  try {
    await pool.query(query);
    console.log("Table 'pet_advocates' is ready.");

    // Check for admin user and create if it doesn't exist
    const adminResult = await pool.query("SELECT * FROM pet_advocates WHERE username = 'admin'");
    if (adminResult.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO pet_advocates (firstName, lastName, username, password, role) VALUES ($1, $2, $3, $4, $5)",
        ['Admin', 'User', 'admin', hashedPassword, 'admin']
      );
      console.log("Default admin user created.");
    }
  } catch (err) {
    console.error("Error creating table or admin user:", err);
  }
};
createTable();

// === API ROUTES ===

// Register (Create User)
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, address, city, state, zip, email, phone, username, password } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ message: "Username, password, and email are required." });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      "INSERT INTO pet_advocates (firstName, lastName, address, city, state, zip, email, phone, username, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [firstName, lastName, address, city, state, zip, email, phone, username, hashedPassword]
    );
    res.status(201).json({ user: newUser.rows[0], message: "User created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering user. Username or email may already exist." });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM pet_advocates WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    // Remove password from user object before sending
    delete user.password;
    res.json({ user, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Get all users (for admin)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, firstName, lastName, address, city, state, zip, email, phone, username, role, onboarding FROM pet_advocates");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Update onboarding
app.put('/api/users/:id/onboarding', async (req, res) => {
    const { id } = req.params;
    const { onboarding } = req.body;
    try {
        const result = await pool.query(
            "UPDATE pet_advocates SET onboarding = $1 WHERE id = $2 RETURNING *",
            [onboarding, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating onboarding status" });
    }
});


app.listen(3001, () => console.log('Server running on port 3001'));

module.exports = app;
