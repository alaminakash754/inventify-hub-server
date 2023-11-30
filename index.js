const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i6c2rzu.mongodb.net/?retryWrites=true&w=majority`;

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

        const userCollection = client.db("inventifyHub").collection("users");
        const shopCollection = client.db("inventifyHub").collection("shops");
        const productCollection = client.db("inventifyHub").collection("products");

        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

        // middlewares verify token 
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // verify admin after verifYToken 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }


        // users related api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            console.log(req.headers);
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // shop related api
        app.post('/shops',verifyToken, async(req,res) => {
            const shopItem = req.body;
            const result = await shopCollection.insertOne(shopItem);
            res.send(result);
        })

        app.get('/shops', async(req, res) => {
            const result = await shopCollection.find().toArray();
            res.send(result)
        });

        app.get('/shops',verifyToken, async(req, res) => {
            const email = req.query.email;
            console.log(email)
            const query = {ownerEmail: email};
            const result = await shopCollection.find(query).toArray();
            res.send(result);
            console.log(result)
          })

        // Product Related api

        app.post('/products',verifyToken, async(req,res) => {
            const productItem = req.body;
            const result = await productCollection.insertOne(productItem);
            res.send(result);
        })

        app.get('/products',verifyToken, async(req, res) => {
            const email = req.query.email;
            // console.log(email)
            const query = {email: email};
            const result = await productCollection.find(query).toArray();
            res.send(result);
            // console.log(result)
          })


          app.get('/products/:id',verifyToken, async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            console.log(query)
            const result = await productCollection.findOne(query);
            res.send(result);
          })
        
          app.patch('/products/:id',verifyToken, async(req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updatedDoc = {
              $set: {
                name: item.name,
                quantity: item.quantity,
                cost: item.cost,
                details: item.details,
                image: item.image,
                location: item.location,
                discount: item.discount,
                profit: item.profit,
                price: item.price

              }
            }
            const result = await productCollection.updateOne(filter, updatedDoc);
            res.send(result)
          })

          app.delete('/products/:id',verifyToken, async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id) }
            // console.log(query);
            const result = await productCollection.deleteOne(query);
            res.send(result);
          })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Inventify-hub is running')
})

app.listen(port, () => {
    console.log(`Inventify Hub is running on port ${port}`)
})