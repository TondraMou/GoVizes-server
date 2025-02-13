const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
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
    // Connect the client to the server (optional starting in v4.7)
    // await client.connect();

    const database = client.db('visaDB');
    const visaCollection = database.collection('visa');
    const userCollection = client.db('visaDB').collection('users');

    // Post Visa Route
    app.post('/visa', async (req, res) => {
      const newVisa = req.body; 
      const userEmail = req.headers['user-email']; 
    
      if (!userEmail) {
        return res.status(401).send({ message: "Unauthorized: User email is required" });
      }
    
      const visaData = {
        ...newVisa, 
        addedBy: userEmail, 
        addedDate: new Date(), 
      };
    
      try {
        const result = await visaCollection.insertOne(visaData);
        res.status(201).send(result); 
      } catch (error) {
        console.error('Error inserting visa:', error); 
        res.status(500).send({ message: 'Error adding visa', error });
      }
    });

// Get All Visas Route
app.get('/visa', async (req, res) => {
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

    // Submit Visa Application Route
    app.post('/apply-visa', async (req, res) => {
      try {
        const { email, firstName, lastName, fee, visaId } = req.body;
        const appliedDate = new Date(); 

        if (!ObjectId.isValid(visaId)) {
          return res.status(400).send({ message: "Invalid visaId format" });
        }

        const visaDetails = await visaCollection.findOne({ _id: new ObjectId(visaId) });

        if (!visaDetails) {
          return res.status(404).send({ message: "Visa details not found for the given visaId" });
        }

        const application = {
          email,
          firstName,
          lastName,
          fee,
          appliedDate,
          visaId,
        };

        const result = await userCollection.insertOne(application);

        res.status(200).send({ message: "Application submitted successfully", result });
      } catch (error) {
        console.error("Error submitting visa application:", error);
        res.status(500).send({ message: "Error submitting visa application" });
      }
    });

    // Get User's Visa Applications Route
    app.get('/my-visa-applications', async (req, res) => {
      try {
        const userEmail = req.query.email;

        // Find applications by user's email
        const userApplications = await userCollection.find({ email: userEmail }).toArray();

        const applicationsWithVisaDetails = await Promise.all(
          userApplications.map(async (application) => {
            const visaDetails = await visaCollection.findOne({ _id: new ObjectId(application.visaId) });
            return {
              ...application,
              visaDetails,
            };
          })
        );

        res.status(200).json(applicationsWithVisaDetails); 
      } catch (error) {
        console.error("Error fetching visa applications:", error);
        res.status(500).send({ message: "Error fetching visa applications" });
      }
    });

    // Delete Visa Application Route
    app.delete('/cancel-visa-application', async (req, res) => {
      try {
        const { applicationId } = req.body;
        const result = await userCollection.deleteOne({ _id: new ObjectId(applicationId) });
        
        if (result.deletedCount === 1) {
          res.status(200).send({ message: 'Application canceled successfully' });
        } else {
          res.status(400).send({ message: 'Failed to cancel application' });
        }
      } catch (error) {
        console.error("Error canceling visa application:", error);
        res.status(500).send({ message: "Error canceling visa application" });
      }
    });

    // Protected Route: Get User's Added Visas
    app.get("/my-added-visas", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      const userVisas = await visaCollection.find({ addedBy: email }).toArray();
      res.send(userVisas);
    });

    // Delete a Visa
    app.delete("/delete-visa/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid visa ID" });
      }

      const result = await visaCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount > 0) {
        res.send({ message: "Visa deleted successfully" });
      } else {
        res.status(404).send({ message: "Visa not found" });
      }
    });

    // Update Visa Route
    app.put("/update-visa/:id", async (req, res) => {
      const id = req.params.id;
      const updatedVisa = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid visa ID" });
      }

      if (Object.keys(updatedVisa).length === 0) {
        return res.status(400).send({ message: "No data provided for update" });
      }

      try {
        const result = await visaCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedVisa }
        );

        if (result.matchedCount > 0) {
          return res.send({ message: "Visa updated successfully" });
        } else {
          return res.status(404).send({ message: "Visa not found" });
        }
      } catch (error) {
        console.error("Error updating visa:", error);
        return res.status(500).send({ message: "Internal server error" });
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
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Visa processing');
});

app.listen(port, () => {
    console.log(`Visa server is running on: ${port}`);
});
