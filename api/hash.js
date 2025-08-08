const bcrypt = require('bcrypt');
module.exports = async (req, res) => {
  const hash = await bcrypt.hash('testpassword123', 10);
  res.json({ hash });
};
