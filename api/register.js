const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { firstName, lastName, email, phone, username, password } = req.body;

  if (!username || !password || !email || !firstName || !lastName || !phone) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Server-side validation to match expected patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;  // Matches XXX-XXX-XXXX
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Phone must be in XXX-XXX-XXXX format' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO pet_advocates (firstname, lastname, email, phone, username, password, role) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [firstName, lastName, email, phone, username, hashedPassword, 'pet-advocate']
    );
    res.json({ message: "Pet Advocate created successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message || "Server error during registration" });
  }
};
