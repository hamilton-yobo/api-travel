// app.js
const express = require('express');
const { connectDB, closeDB, client } = require('./config/db'); // Import from your new db.js module
const app = express();
const port = 3000;

app.use(express.json());

// Call the connectDB function and then start the server
connectDB()
  .then(() => {
    const database = client.db("backendMasterclassDB");
    const productsCollection = database.collection("products");

    app.get('/api/products', async (req, res) => {
        try {
            const products = await productsCollection.find({}).toArray();
            res.json(products);
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ message: "Failed to fetch products" });
        }
    });

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error("Application failed to start due to database connection error:", err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await closeDB(); // Use the closeDB function
  process.exit(0);
});