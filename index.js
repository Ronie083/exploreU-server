require('dotenv').config()
var jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const cors = require('cors');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization)
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoder) => {
    // console.log(err, decoder)
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoder = decoder;
    next();
  })
}



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
    // await client.connect();

    const allUsers = client.db("exploreUData").collection("users");
    const allClasses = client.db("exploreUData").collection("classes");
    const allInstructors = client.db("exploreUData").collection("instructors");
    const enrolledCart = client.db("exploreUData").collection("coursesCart");
    const newClasses = client.db("exploreUData").collection("newClasses");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const jwtToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ jwtToken })
    })

    app.get('/users', async (req, res) => {
      const result = await allUsers.find().toArray();
      res.send(result);
    })

    app.get('/usersSingle/:email', async (req, res) => {
      const result = await allUsers.findOne({email:req.params.email})
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

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email){
        res.send({admin: false})
      }
        const query = { email: email }
      const user = await allUsers.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
      console.log(result)
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await allUsers.updateOne(query, updateDoc);
      res.send(result)
    })

    app.patch('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await allUsers.updateOne(query, updateDoc);
      res.send(result);
    });


    app.get('/classes', async (req, res) => {
      const result = await allClasses.find().toArray();
      res.send(result)
    })

    app.get('/instructors', async (req, res) => {
      const result = await allInstructors.find().toArray();
      res.send(result)
    })

    app.get('/newCourse', async (req, res) => {
      const result = await newClasses.find().toArray();
      res.send(result)
    })

    app.patch('/newCourse/:id/feedback', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query)
      const updateDoc = {
        $set: {
          feedback: req.body.feedback
        },
      };
      const result = await newClasses.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch('/newCourse/:id/approve', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          courseStatus: 'Approved'
        },
      };
      const result = await newClasses.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch('/newCourse/:id/deny', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          courseStatus: 'Denied'
        },
      };
      const result = await newClasses.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get('/enrolledCart', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      

      const decodedEmail = req.decoder.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
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

    app.post('/newCourse', async (req, res) => {
      const courseData = req.body;
      const result = await newClasses.insertOne(courseData);
      res.send(result)
    })

    app.delete('/enrolledCart/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await enrolledCart.deleteOne(query);
      res.send(result);
    })

    app.post('/create-payment-intent', verifyJWT, async (req, res)=> {
      const {price} =req.body;
      const amount = parseInt(price * 100);
      const paymentIntent =await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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