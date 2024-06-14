if(process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

require('dotenv').config();


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingsRoute = require("./routes/listing.js");
const reviewsRoute = require("./routes/review.js");
const userRoute = require("./routes/user.js");



const dbUrl = process.env.ATLASDB_URL;
// console.log(dbUrl);

main().then((res)=> {
    console.log("Connected to DB.");
})
.catch(err => {if (err instanceof DNSException) {
    console.error(`DNS Exception: ${err.message}`);
    console.error(`Binding Name: ${err.bindingName}`);
    console.error(`Hostname: ${err.hostname}`);
} else {
    console.error(`An unexpected error occurred: ${err.message}`);
}});

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


const store = MongoStore.create({
    mongoUrl : dbUrl,
    crypto : {
        secret : process.env.SECRET,
    },
    touchAfter : 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 *1000,
        maxAge : 7 * 24 * 60 * 60 *1000,
        httpOnly : true,
    },
};

// app.get("/", (req,res)=>{
//     res.send("Hi, I'm root");
// });


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async (req,res) => {
//     let fakeUser = new User({
//         email : "tarun@email.com",
//         username : "delta-student",
//     });

//     let registerdUser = await User.register(fakeUser, "helloWorld");
//     res.send(registerdUser);
// })

app.use("/listings", listingsRoute);
app.use("/listings/:id/reviews", reviewsRoute)
app.use("/", userRoute);


app.all("*",(req,res,next)=> {
    next(new ExpressError (404, "Page not found"));
});

app.use((err,req,res,next)=> {
    let {statusCode = 500, message= "Something Went Wrong !"} = err;
    res.status(statusCode).render("listings/error.ejs", {message});
    // res.status(statusCode).send(message);
});

app.listen(8080, ()=> {
    console.log("Server is listening to port 8080");
});
