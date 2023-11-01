const express = require ("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;


app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials:true,
  })
);
app.use(express.json())
app.use(cookieParser());

//won middleware

const logger = async (req,res,next)=>{
  console.log('called:',res.host,req.originalUrl)
  next();
}

const verifyToken = async(req,res,next)=>{
  const token = req.cookies?.token;
  console.log('value of token in middleware', token);
  if(!token){
    return res.status(401).send({message:'not Authorized'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unAuthorized" });
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};
//jwt middleware
 


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tcgprmi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



async function run() {
  try {
    
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db('carDoctor').collection('bookings')

    //auth related api
    // app.post('/jwt',async(req, res)=>{
    //   const user = req.body;
    //   console.log('user for token',user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "1h",
    //   });
    //   res.cookie('token',token,{
    //     httpOnly: true,
    //     secure: true,
    //     sameSite:'none'
    //   })
    //   send({success:true})
    // })
    
    
    
    //auth related
    app.post('/jwt',logger, async(req, res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false,
        // sameSite: 'none',
        // maxAge:
      })
      .send({success: true})
    })

    //logout user
    app.post('/logout',async(req, res)=>{
      const user = req.body;
      res.clearCookie('token',{maxAge: 0}.send({success: true}))
    })


    // service related 
    app.get("/services", logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    //fine one // get one 

    app.get("/services/:id",async(req, res)=>{
     const id = req.params.id;
     const query = {_id: new ObjectId(id)}

         const options = {
           
           projection: { title: 1, price: 1, serviceId:1,img:1 },
         };

     const result = await serviceCollection.findOne(query, options)
     res.send(result)
    })

    //booking


    //get data
    app.get("/bookings", logger,verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("tok tok token", req.cookies.token);
      
      if(req.query.email !== req.query.email){
        return res.status(403).send({message: 'forbidden Access'})
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await bookingCollection.find().toArray();
      res.send(result);
    });



    //insert data
    app.post('/bookings',async(req, res)=>{
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
      console.log(booking);
    })

    //update
    app.patch('bookings/:id',async(req, res)=>{
      const id = req.params.id;
      const filter ={id: new ObjectId(id)}; 
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc ={
        $set:{
          status: updateBooking.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result);
    })

    // delete

    app.delete("/bookings/:id",async(req, res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result);
    })


    
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
//     await client.close();
  }
}
run().catch(console.dir);






app.get("/",(req,res)=>{
     res.send("doctor is running ")
});

app.listen(port,()=>{
     console.log(`car doctor is running on ,${port}`);
})
