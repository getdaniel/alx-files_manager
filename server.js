const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Load all routes
const routes = require('./routes/index');
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
