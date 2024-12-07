const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// MiddleWear
app.use(cors());
app.use(express.json());
require("dotenv").config();




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wmzdc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db('visaDB');
    const visaCollection = database.collection('visa');


    // Add Visa Route
    app.post('/visa', async(req, res) => {
      const newVisa = req.body;
      
      const result = await visaCollection.insertOne(newVisa);
      res.send(result);
    });


    // Get All Visas Route 
    app.get('/visas', async (req, res) => {
      try {
        const visas = await visaCollection.find({}).toArray(); 
        res.json(visas);
      } catch (error) {
        console.error("Error fetching visas:", error);
        res.status(500).send("Error fetching visas");
      }
    });


    // Fetch Visa by ID Route
app.get('/visa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ObjectId } = require('mongodb');
    const visaId = new ObjectId(id);

    const visa = await visaCollection.findOne({ _id: visaId });

    if (visa) {
      res.json(visa); 
    } else {
      res.status(404).send({ message: "Visa not found" });
    }
  } catch (error) {
    console.error("Error fetching visa by ID:", error);
    res.status(500).send({ message: "Error fetching visa by ID" });
  }
});
    

    // Fetch the latest 6 visas
app.get('/latest-visas', async (req, res) => {
  try {
    const latestVisas = await visaCollection
      .find({}) 
      .sort({ _id: -1 }) 
      .limit(6) 
      .toArray(); 
    res.send(latestVisas);
  } catch (error) {
    console.error('Error fetching latest visas:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Visa processing')
})
app.listen(port, () => {
    console.log(`Visa server is running on: ${port}`)
})