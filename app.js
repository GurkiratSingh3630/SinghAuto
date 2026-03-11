const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const { MONGODB_URI } = require("./credentials");
const Booking = require("./models/Booking");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));
app.use("/data", express.static(path.join(__dirname, "data")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "singh-auto-secret",
    resave: false,
    saveUninitialized: false
  })
);

app.use((req, res, next) => {
  res.locals.currentUserEmail = req.session.userEmail || null;
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  }
});

const upload = multer({ storage });

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    req.session.message = "Please log in to view that page.";
    return res.redirect("/login");
  }
  next();
}

app.get("/", async (req, res) => {
  let latest = [];
  try {
    latest = await Booking.find().sort({ createdAt: -1 }).limit(5);
  } catch (e) {}
  res.render("index", { title: "Singh Auto", bookings: latest });
});

app.get("/services/oil-change", (req, res) => {
  res.render("services/oil-change", { title: "Oil Change — Singh Auto" });
});

app.get("/services/tire-service", (req, res) => {
  res.render("services/tire-service", { title: "Tire Service — Singh Auto" });
});

app.get("/services/brake-service", (req, res) => {
  res.render("services/brake-service", { title: "Brake Service — Singh Auto" });
});

app.get("/about", (req, res) => {
  res.render("about", { title: "About — Singh Auto" });
});

app.get("/contact", (req, res) => {
  res.render("contact", { title: "Contact — Singh Auto" });
});

app.get("/book", (req, res) => {
  const visits = (req.session.bookVisits || 0) + 1;
  req.session.bookVisits = visits;
  res.render("book", { title: "Book — Singh Auto", bookVisits: visits });
});

app.post("/book", upload.single("photo"), async (req, res) => {
  const { name, phone, year, make, model, vehicle, service, date, notes } = req.body;

  const vehicleValue =
    vehicle && vehicle.trim() !== "" ? vehicle : [year, make, model].filter(Boolean).join(" ");

  const photoName = req.file ? req.file.filename : null;

  try {
    const booking = await Booking.create({
      name,
      phone,
      vehicle: vehicleValue,
      service,
      date,
      notes,
      photo: photoName
    });

    res.render("book-success", { title: "Booking Submitted", data: booking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(400).render("book-success", {
      title: "Booking Error",
      data: {
        name,
        phone,
        vehicle: vehicleValue,
        service,
        date,
        notes
      }
    });
  }
});

app.get("/api/estimate", (req, res) => {
  const service = req.query.service || "";
  const year = req.query.year || "";
  const make = req.query.make || "";
  const model = req.query.model || "";

  let min = 0;
  let max = 0;

  if (service === "Oil Change") {
    min = 89;
    max = 129;
  } else if (service === "Tire Swap / Balance") {
    min = 69;
    max = 119;
  } else if (service === "Brake Service") {
    min = 149;
    max = 299;
  } else if (service === "Inspection / Other") {
    min = 59;
    max = 149;
  } else {
    return res.json({ min: null, max: null, message: "Select a service to see an estimate." });
  }

  const y = parseInt(year, 10);
  if (!isNaN(y)) {
    if (y >= 2020) {
      min += 10;
      max += 20;
    } else if (y < 2010) {
      min += 10;
      max += 30;
    }
  }

  const luxuryMakes = ["BMW", "Mercedes", "Mercedes-Benz", "Audi", "Lexus"];
  if (make && luxuryMakes.includes(make)) {
    min += 20;
    max += 40;
  }

  res.json({
    min,
    max,
    service,
    year,
    make,
    model,
    message: "Estimate is for labour and basic parts. Final price may vary after inspection."
  });
});

app.get("/register", async (req, res) => {
  const existing = await User.findOne({});
  if (existing) {
    req.session.message = "Admin already exists. Please log in.";
    return res.redirect("/login");
  }
  res.render("auth/register", { title: "Register Admin" });
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.render("auth/register", {
        title: "Register Admin",
        error: "User already exists."
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.create({
      email,
      passwordHash: hash,
      role: "admin"
    });

    req.session.message = "Admin registered. Please log in.";
    res.redirect("/login");
  } catch (err) {
    console.error("Register error:", err);
    res.render("auth/register", {
      title: "Register Admin",
      error: "Error creating admin."
    });
  }
});

app.get("/login", (req, res) => {
  res.render("auth/login", { title: "Admin Login" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("auth/login", {
        title: "Admin Login",
        error: "Invalid email or password."
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.render("auth/login", {
        title: "Admin Login",
        error: "Invalid email or password."
      });
    }

    req.session.userId = user._id.toString();
    req.session.userEmail = user.email;
    res.redirect("/admin");
  } catch (err) {
    console.error("Login error:", err);
    res.render("auth/login", {
      title: "Admin Login",
      error: "Error logging in."
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/admin", requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      bookings
    });
  } catch (err) {
    console.error("Admin error:", err);
    res.status(500).render("404", { title: "Server Error" });
  }
});

app.use((req, res) => {
  res.status(404).render("404", { title: "Not Found" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});