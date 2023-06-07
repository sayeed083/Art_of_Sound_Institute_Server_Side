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
//MongoDB Ends




app.get('/', (req, res) => {
    res.send('Summer Camp School is on LIVE')
})

app.listen(port, () => {
    console.log(`Summer Camp School is running on port: ${port}`);
})
