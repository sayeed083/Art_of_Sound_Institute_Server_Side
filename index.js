const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require("dotenv").config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SK)
const port = process.env.PORT || 5000


//MiddleWare
app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // Bearer Token Generate!
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


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

        // TODO
        // await client.connect();

        //Database and Collections Here
        const userCollection = client.db("summerCamp").collection("user");
        const classCollection = client.db("summerCamp").collection("class");
        const instructorCollection = client.db("summerCamp").collection("instructor");
        const selectedClassCollection = client.db("summerCamp").collection("selectedClass");
        const paymentCollection = client.db("summerCamp").collection("payment");

        // All CRUD Operation Here

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        // const verifyInstructor = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email }
        //     const user = await userCollection.findOne(query);
        //     if (user?.role !== 'instructor') {
        //         return res.status(403).send({ error: true, message: 'forbidden message' });
        //     }
        //     next();
        // }










        //User Side

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
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

        // For getting specific user base dashboard
        // #useAdmin

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })


        // For Use A Hook For Instructor Validation
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            console.log('Instructor Emaill', email);
            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })

        //for update a role

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })







        //Class Side

        app.get('/classes', async (req, res) => {
            const sortField = req.query.sortField || 'students';
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            const result = await classCollection.find().sort({ [sortField]: sortOrder }).toArray()
            res.send(result)
        });


        //For getting classes by id

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.findOne(query);
            res.send(result);
        })


        // For Showing Instructor Specific Selected Class List

        app.get('/myInstructorClass', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }

            const query = { email: email };
            const result = await classCollection.find(query).toArray();
            res.send(result);

        });


        app.patch('/classes/status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const newStatus = {
                $set: {
                    status: 'approve'
                },
            };
            const result = await classCollection.updateOne(filter, newStatus)
            res.send(result)
        })
        app.patch('/classes/statusDeny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const newDeniedStatus = {
                $set: {
                    status: 'denied'
                },
            };
            const result = await classCollection.updateOne(filter, newDeniedStatus)
            res.send(result)
        })

        app.patch('/classes/feedback/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const feedback = req.body.feedback;
            const giveFeedBack = {
                $set: {
                    feedback: feedback
                },
            };

            const result = await classCollection.updateOne(filter, giveFeedBack);

            res.send(result);
        });



        app.patch('/classes/updateMyClass/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateClasses = req.body;
            const updatingClass = {
                $set: {
                    price: updateClasses.price,
                    availableSeats: updateClasses.availableSeats
                }

            }
            const result = await classCollection.updateOne(filter, updatingClass, options)
            res.send(result);


        })

        app.post('/classes', async (req, res) => {
            const newCls = req.body;
            newCls.status = 'pending';
            newCls.students = 0;
            const result = await classCollection.insertOne(newCls)
            res.send(result);
        })





        //Instructors Side

        app.get('/instructors', async (req, res) => {
            const sortField = req.query.sortField || 'numberOfClassesTaken';
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
            const result = await instructorCollection.find().sort({ [sortField]: sortOrder }).toArray()
            res.send(result)
        });

        app.post('/instructors', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existUser = await instructorCollection.findOne(query)
            console.log("Already Here:", existUser);
            if (existUser) {
                return res.send({ message: 'User Already Exists' })
            }
            const result = await instructorCollection.insertOne(user)
            res.send(result)
        });




        //Selected Class Side

        app.get('/selectedClass', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }

            const query = { email: email };
            const result = await selectedClassCollection.find(query).toArray();
            res.send(result);

        });

        app.get('/selectedClass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.findOne(query);
            res.send(result);
        })


        app.post('/selectedClass', async (req, res) => {
            const item = req.body;
            item.payment = false;
            console.log(item);
            const result = await selectedClassCollection.insertOne(item);
            res.send(result);
        });


        app.delete('/selectedClass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedClassCollection.deleteOne(query);
            res.send(result);
        });



        // Payment CRUD HERE



        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            console.log(price, amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })





        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);

            const selectedClassFilter = { _id: new ObjectId(payment.selecteddClass) };
            const selectedClassUpdate = { $set: { payment: true } };
            const selectedClassUpdateResult = await selectedClassCollection.updateOne(selectedClassFilter, selectedClassUpdate);

            const classFilter = { _id: new ObjectId(payment.onlyAllClass) };
            const classUpdate = {
                $inc: { availableSeats: -1, students: 1 }
            };
            const classUpdateResult = await classCollection.updateOne(classFilter, classUpdate);

            res.send({ result, selectedClassUpdateResult, classUpdateResult });
        });


        //Payment history

        app.get('/paymentsh', async (req, res) => {
            const sortField = req.query.sortField || 'date';
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

            const result = await paymentCollection.find().sort({ [sortField]: sortOrder }).toArray()
            res.send(result)
        });



        // const sortField = req.query.sortField || 'numberOfClassesTaken';
        // const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        // .sort({ [sortField]: sortOrder })







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
