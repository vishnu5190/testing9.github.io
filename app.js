require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const Razorpay = require('razorpay')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const nodemailer = require("nodemailer");
// const PaymentDetail =  require('./models/payment-detail')

const { nanoid } = require("nanoid");

const app = express();

app.use(express.static("public"));
app.set("view engine" , "ejs");
app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/foo" , {useUnifiedTopology: true , useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    
    fname: String,
    lname: String,
    address:String,
    state: String,
    city: String,
    country: String,
    pincode: String,
    username: String,
    password: String,
    title: [{type: String , require: true}],
    posts: [{type: String , require: true}]
    
      
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User" , userSchema);

///////////////

const paymentDetailsSchema = new mongoose.Schema({
	orderId: {
		type: String,
		required: true
	},
	receiptId: {
		type: String
	},
	paymentId: {
		type: String,
	},
	signature: {
		type: String,
	},
	amount: {
		type: Number
	},
	currency: {
		type: String
	},
	createdAt: {
		type: Date
	},
	status: {
		type: String
	}
});

const PaymentDetail = new mongoose.model('PaymentDetail', paymentDetailsSchema)

// Create an instance of Razorpay
let razorPayInstance = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET
})



passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });







app.get("/" , function(req , res){
    // res.render("home")

    ////////new code
    User.find({"title": {$ne: null} , "posts": {$ne: null}  }, function(err , foundUsers){
        if(err){
            console.log(err);
        } else {
            if (foundUsers){
                
                res.render("home" , {admin : foundUsers});
                console.log(foundUsers);
                //    res.render("home")
            }
        }
    });







});

////////sending automatic email
var transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.USER_ID,
      pass: process.env.PASS,
    }
  });
 

     var sendConfirmationEmail = (name, email) => {
    console.log("Check");
    transport.sendMail({
      from: process.env.USER_ID,
      to: email,
      subject: "conformation for signup on our website",
      html: `<div>
            <h1>good morning </h1>
          <h2>Hello ${name}</h2>
          <p>you have successfully signed up on our website, now u can have all access just log in to our websites. </p>
         
          </div>`,
    }).catch(err => console.log(err));
  };

  //////////////////////////
  //sending confirmation mail to admin

  var sendConfirmationEmailtoAdmin = (fname , lname,address,state,city,country,pincode,username) => {
    console.log("Check");
    transport.sendMail({
      from: process.env.USER_ID,
      to: "vedanthvbaliga@gmail.com " ,
      subject: "new user signup",
      html: `<div>
            <h1>good morning Admin </h1>
          <h2>${fname} joined our website</h2>
          <h3>fname : ${fname} </h3>
          <h3>lname : ${lname} </h3>
          <h3>address : ${address} </h3>
          <h3>state : ${state} </h3>
          <h3>city : ${city} </h3>
          <h3>country : ${country} </h3>
          <h3>pincode : ${pincode} </h3>
          <h3>email : ${username} </h3>
          <p>you have successfully signed up on our website, now u can have all access just log in to our websites. </p>
         
          </div>`,
    }).catch(err => console.log(err));
  };


/////////////////////////////


app.get("/sign" , function(req, res){
    res.render("sign")
});

app.get("/register" , function(req, res){
    res.render("register")
});


app.post("/register" , function(req , res){
    User.register({username: req.body.username , fname: req.body.fname , lname: req.body.lname , address: req.body.address, state : req.body.state , city: req.body.city , country: req.body.country , pincode: req.body.pincode  }, req.body.password , function(err , user){



        if(err){
            console.log(err);
            res.redirect("/register");

        } else{
            passport.authenticate("local")(req , res, function(){

                      sendConfirmationEmail(
                         req.body.fname,
                        req.body.username,
                          
                    );

                    ////////sending mail to admin
                    sendConfirmationEmailtoAdmin(
                        req.body.fname ,
                        req.body.lname  ,
                        req.body.address  ,
                        req.body.state  ,
                        req.body.city  ,
                        req.body.country  ,
                        req.body.pincode  ,
                        req.body.username
                    )

                  res.redirect("/");

                
            });
        }
    })
});




app.post("/sign" , function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);

        }else{

           passport.authenticate("local")(req, res , function(){
                res.redirect("/");
            });
        
        }
    });
});


app.get("/submit" , function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");

    }else{
        res.redirect("/sign");
    }
});


app.post("/submit", function(req, res){
    const submittedTitle = req.body.title;
    const submittedPosts = req.body.posts;

    console.log(req.user.id);
    User.findById(req.user.id , function(err , foundUser){
        if (err){
            console.log(err);

        } else{
            if (foundUser) {
                    
                   foundUser.title.push(submittedTitle)
                   foundUser.posts.push(submittedPosts)
               /* foundUser.posts = submittedPosts ;  */
                foundUser.save(function(){
                    res.redirect("/");
                });
            }
        }
    });
});

app.get("/donate", function(req , res){
    res.render("donate")
})

app.get("/order" , function(req, res){
    res.render("order")
})

/**
 * Checkout Page
 * 
 */
 app.post('/order', function(req, res, next) {
	params = {
		amount: req.body.amount * 100,
		currency: "INR",
		receipt: nanoid(),
		payment_capture: "1"
	}
	razorPayInstance.orders.create(params)
	.then(async (response) => {
		// Save orderId and other payment details
		const paymentDetail = new PaymentDetail({
			orderId: response.id,
			receiptId: response.receipt,
			amount: response.amount,
			currency: response.currency,
			createdAt: response.created_at,
			status: response.status
		})
		try {
			// Render Order Confirmation page if saved succesfully
			await paymentDetail.save()
			res.render('checkout', {
				title: "Confirm Order",
				paymentDetail : paymentDetail
			})
		} catch (err) {
			// Throw err if failed to save
			if (err) throw err;
		}
	}).catch((err) => {
		// Throw err if failed to create order
		if (err) throw err;
	})
});


app.post('/verify', async function(req, res, next) {
	body=req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
	let crypto = require("crypto");
	let expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
							.update(body.toString())
							.digest('hex');

	// Compare the signatures
	if(expectedSignature === req.body.razorpay_signature) {
		// if same, then find the previosuly stored record using orderId,
		// and update paymentId and signature, and set status to paid.
		await PaymentDetail.findOneAndUpdate(
			{ orderId: req.body.razorpay_order_id },
			{
				paymentId: req.body.razorpay_payment_id,
				signature: req.body.razorpay_signature,
				status: "paid"
			},
			{ new: true },
			function(err, doc) {
				// Throw er if failed to save
				if(err){
					throw err
				}
				// Render payment success page, if saved succeffully
				res.render('success', {
					title: "Payment verification successful",
					paymentDetail: doc
				})
			}
		);
	} else {
		res.render('fail', {
			title: "Payment verification failed",
		})
	}
});










app.listen(3006, function(){
    console.log("server running on port 3006")
})