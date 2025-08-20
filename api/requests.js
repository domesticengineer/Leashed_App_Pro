const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = req.query; // For advocate's assigned requests

  try {
    let query = "SELECT * FROM service_requests WHERE status = 'pending'";
    const params = [];
    if (userId) {
      query = "SELECT * FROM service_requests WHERE assigned_to = $1 AND status = 'accepted'";
      params.push(userId);
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
