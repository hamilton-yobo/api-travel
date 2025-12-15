require('dotenv').config(); // Essential to load env variables here too

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectDB() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return client; // Return the connected client
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    throw error; // Re-throw to be caught by the calling app
  }
}

async function closeDB() {
  console.log('Closing MongoDB connection.');
  await client.close();
}

module.exports = { connectDB, closeDB, client };