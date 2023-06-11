const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dlzg3av.mongodb.net/?retryWrites=true&w=majority`;

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

    const allUsers = client.db("exploreUData").collection("users");
    const allClasses = client.db("exploreUData").collection("classes");
    const allInstructors = client.db("exploreUData").collection("instructors");
    const enrolledCart = client.db("exploreUData").collection("coursesCart");

    app.get('/users', async (req, res) =>{
      const result = await allUsers.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const users = req.body;
      const query = { email: users.email }
      const existUser = await allUsers.findOne(query);
      if (existUser) {
        return res.send()
      }
      const result = await allUsers.insertOne(users);
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const result = await allClasses.find().toArray();
      res.send(result)
    })

    app.get('/instructors', async (req, res) => {
      const result = await allInstructors.find().toArray();
      res.send(result)
    })

    app.get('/enrolledCart', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await enrolledCart.find(query).toArray();
      res.send(result);
    })

    app.post('/enrolledCart', async (req, res) => {
      const course = req.body;
      console.log(course);
      const result = await enrolledCart.insertOne(course);
      res.send(result)
    })

    app.delete('/enrolledCart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await enrolledCart.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('ExploreU summer camp course data stored here')
})

app.listen(port, () => {
  console.log(`Explore-U data running on port ${port}`)
})