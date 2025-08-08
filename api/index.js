// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    let result = await pool.query("SELECT * FROM pet_advocates WHERE username = $1", [username]);

    // ** NEW SELF-HEALING LOGIC **
    // If the admin user does not exist, and the login attempt is for the default admin, create it now.
    if (result.rows.length === 0 && username === 'admin' && password === 'admin123') {
      console.log('Admin user not found, creating now...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO pet_advocates (firstName, lastName, username, password, role) VALUES ($1, $2, $3, $4, $5)",
        ['Admin', 'User', 'admin', hashedPassword, 'admin']
      );
      // Re-fetch the user after creating it
      result = await pool.query("SELECT * FROM pet_advocates WHERE username = $1", [username]);
      console.log('Admin user created successfully.');
    }
    // ** END OF NEW LOGIC **

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
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});
