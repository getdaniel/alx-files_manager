const express = require('express');
const app = express();

const PORT = process.env.PORT || 5000;

// Load routes from routes/index.js
const routes = require('./routes');
app.use('/', routes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
