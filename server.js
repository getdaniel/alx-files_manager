const express = require('express');
const app = express();

const PORT = process.env.PORT || 5000;

// Load routes
const routes = require('./routes');
app.use(routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
