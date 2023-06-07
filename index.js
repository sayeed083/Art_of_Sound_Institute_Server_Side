const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const cors = require('cors');
const port = process.env.PORT || 5000


//MiddleWare
app.use(cors())
app.use(express.json())


//MongoDB Starts


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5nuw1j2.mongodb.net/?retryWrites=true&w=majority`;

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

        //Database and Collections Here
        const userCollection = client.db("summerCamp").collection("user");
        const classCollection = client.db("summerCamp").collection("class");

        // All CRUD Operation Here

        //User Side

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        });



        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existUser = await userCollection.findOne(query)
            console.log("Already Here:", existUser);
            if (existUser) {
                return res.send({ message: 'User Already Exists' })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        });

        //Class Side

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        });











        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

















//MongoDB Ends




app.get('/', (req, res) => {
    res.send('Summer Camp School is on LIVE')
})

app.listen(port, () => {
    console.log(`Summer Camp School is running on port: ${port}`);
})
