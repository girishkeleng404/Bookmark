import express from "express"
import pg from "pg"
import bodyParser from "body-parser"
import env from "dotenv";
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2"
import bcrypt from "bcrypt";
import axios from "axios";

const app = express();
const port = 3000;
const saltRound = 10;

env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 *60,
    },
})
);


app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
db.connect();

let books = [

]


app.get("/", async (req, res) => {
res.render("index.ejs");
  
   
})
app.get("/login", (req, res) => {
    res.render('login.ejs');
})
app.get("/register", (req, res) => {
    res.render('register.ejs');
})

app.get("/home", async (req, res) => {

    if(req.isAuthenticated()){
       
          try {
           
                const result1 = await db.query("SELECT * FROM users WHERE email = $1",[req.user.email]);
                const checkId = result1.rows[0].id
                // console.log(user_id);
        
                const {rows} = await db.query("SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC",[checkId]);
                books=rows;
                res.render('home.ejs',{books:books});

            } catch (error) {
             console.log(error)   
            } 
        } else{
        res.redirect("/login");
        }

    
})

app.get("/new",async (req, res) => {
    res.render("new.ejs");
})

// -----------xxxx-----------
app.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
);


app.get(
    "/auth/google/home",
    passport.authenticate("google", {
        successRedirect: "/home",
        failureRedirect: "/login",
    })
);

app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
    })
  );


// ----------------------xxxxxxxxxxxxxx--------------------------
app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    try {
        const checkEmail = await db.query("SELECT * FROM users WHERE email =$1", [email]);
        if (checkEmail.rows.length > 0) {
            req.redirect("/login");
        } else {
            bcrypt.hash(password, saltRound, async (err, hash) => {
                if (err) {
                    console.log("Error hashing password", err);
                } else {
                    const result = await db.query("INSERT INTO users (email,password) VALUES ($1,$2) RETURNING *", [email, hash]);
                    const user = result.rows[0];
                    req.login(user, (err) => {
                        console.log("success");
                        res.redirect("/home");
                    });
                }
            })
        }
    }
    catch (err) {
        console.loog("error", err);
    }
})

app.post("/new", async(req,res)=>{
    if(req.isAuthenticated()){


        const tittle = req.body.name;
        let modified_name = tittle.replace(/\s/g, "+");
        let {notes} = req.body;
        let {rating} = req.body;
        console.log(modified_name);

     try {
        const book = await axios.get(process.env.API1+"q="+modified_name);
        let {cover_i}= book.data.docs[0];
        const author = book.data.docs[0].author_name[0];
        const first_sentence = book.data.docs[0].first_sentence[0]

         try {
            const coverResponse = await axios.get(process.env.API2+cover_i+"-M.jpg");
            let cover_id = coverResponse.config.url;

            const result1 = await db.query("SELECT * FROM users WHERE email = $1",[req.user.email]);
            const checkId = result1.rows[0].id

            await db.query("INSERT INTO books (cover_id,tittle,author,isbn,notes,brief,rating,user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",[cover_id,tittle,author,cover_i,notes,first_sentence,rating,checkId]);
            res.redirect("/home");
            
         } catch (error) {
            console.error("Error fetching cover image:", error);
         }

     } catch (error) {
        console.error("Error fetching book data:", error);
     }

    }
})
// ----------xxxxxxxx----------


app.post("/details", async(req,res)=>{
    const { details } = req.body;
    const {detailName}= req.body;
    console.log(details);
    console.log(detailName);
    if(req.isAuthenticated()){

   
   
    try {
      if(details){ 
        let detailData = await db.query("SELECT * FROM books WHERE id = $1", [details]); 
        res.render("details.ejs",{datas: detailData.rows})
      } 
       else if(detailName){
      
        let detailData = await db.query("SELECT id, cover_url, book_name, author, notes, rating, cover_id, brief FROM books WHERE id = $1", [detailName]);
          res.render("details.ejs",{datas: detailData.rows})
      }
      
      // console.log(detailData.rows);
      
    } catch (error) {
      console.log(error);
    }

} else{
    res.redirect("/login");
}
  })
// --------------xxxxxxx--------------

app.post("/edit", async (req,res)=>{
    if(req.isAuthenticated()){
    const {edit_id} = req.body;
    console.log(edit_id);

    try {
      let detailData = await db.query("SELECT * FROM books WHERE id = $1", [edit_id]);

       res.render("edit.ejs",{eData: detailData.rows});
    } catch (error) {
      console.log(error);
    } 
} else{
    res.redirect("/login");
}

})

app.post("/update",async(req,res)=>{
    if(req.isAuthenticated()){

         let {name}= req.body;
    let {notes} = req.body;
    let {rating}= req.body;
    let {id}= req.body;
    console.log("done"+id);
    try {
        await db.query("UPDATE books SET tittle = $1,notes = $2,rating = $3 WHERE id =$4",[name,notes,rating,id]);
        res.redirect('/home');
    } catch (error) {
        console.log(error);
    }

    } else{
        res.redirect("/login")
    }
   
})


// -----------xxxxxxxxxx---------

app.post("/search", async(req, res)=>{

    let input = req.body.search 
    console.log(input)
    
    try {
        const result = await db.query(
            "SELECT id, cover_id, tittle, author, notes, rating, isbn, brief FROM books WHERE LOWER(tittle) LIKE '%' || $1 || '%';",   // done
            [input.toLowerCase()])
            res.render("home.ejs",{books:result.rows});
    } catch (error) {
        console.log(error);
    }
})
// -------------x-xx-x-x-x----------

app.post("/sort", async (req, res) => {
    if(req.isAuthenticated()){
    let {sort} = req.body;
    let order = 'ASC';
    console.log(sort);
    let idORrating = "id";
    if(sort =="rating_top" || sort == "rating_low"){
      idORrating = "rating";
    }
  
    // Dynamically determine order based on selection
    if (sort.includes('date_added') && sort.includes('new')) {
      order = 'DESC';
    } else if (sort.includes('rating') && sort.includes('top')) {
      order = 'DESC';
    }
  
   
    try {
        const result1 = await db.query("SELECT * FROM users WHERE email = $1",[req.user.email]);
          const checkId = result1.rows[0].id

      const { rows } = await db.query(`SELECT * FROM books WHERE user_id = $1 ORDER BY ${idORrating} ${order}`,[checkId]);
      const books = rows;
  
      res.render('home.ejs', {books:books }); // Assuming an EJS template for rendering
    } catch (error) {
      console.error(error);
      res.status(500).send('Error occurred while sorting books.');
    }

} else{
    res.redirect("/login");
}
  });





// -----------------xxxx----------------
passport.use(
    "local",
    new Strategy(async function verify(username, password, cb) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [username,]);

            if (result.rows.length > 0) {
                const user = result.rows[0];
                const storedHashPassword = user.password;
                bcrypt.compare(password, storedHashPassword, (err, valid) => {
                    if (err) {
                        console.log("Error comparing pasword:", err);
                        return cb;
                    } else {
                        if (valid) {
                            return cb(null, user);
                        } else {
                            return cb(null, false);
                        }
                    }
                });
            } else {
                return cb("User not found");
            }
        } catch (error) {
console.log(error);
        }
    })
)


// ------------xxx --------------
passport.use(
    "google",
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/home",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
        async (accessToken, referenceToken, profile, cb) => {
            try {
              console.log(profile);
            const result = await db.query("SELECT * FROM users WHERE email = $1", [profile.email,]);
            if (result.rows.length === 0) {
                const newUser = await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [profile.email, "google"]);
                return cb(null,newUser.rows[0]);
            } else{
                return cb (null, result.rows[0]);
            }
            } catch (error) {
                return cb(error);
            }
           
        }
    )
)

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Listen on ${port}`)
})