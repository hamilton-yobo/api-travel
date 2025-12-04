// app.js or server.js
require('dotenv').config(); // Load environment variables from .env file at the very top

const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb'); // Import MongoClient
const app = express();
const port = 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // You can now access your database and collections
    // For example:
    const database = client.db("backendMasterclassDB"); // Replace with your database name
    const productsCollection = database.collection("products"); // Example collection

    // Define a simple API endpoint (similar to what we did in Module 1)
    app.get('/api/products', async (req, res) => {
        try {
            // Find all products in the collection
            const products = await productsCollection.find({}).toArray();
            res.json(products);
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ message: "Failed to fetch products" });
        }
    });

    // Start the Express server
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    // Exit process if database connection fails, as the app won't function
    process.exit(1);
  }
}

run().catch(console.dir); // Execute the connection function

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server shutting down. Closing MongoDB connection.');
  await client.close();
  process.exit(0);
});