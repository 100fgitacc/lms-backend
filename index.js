const express = require('express')

const app = express();

// packages
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

// connection to DB and cloudinary
const { connectDB } = require('./config/database');
const { cloudinaryConnect } = require('./config/cloudinary');



require("./cron/autoCheckHomework");

// routes
const userRoutes = require('./routes/user');
const profileRoutes = require('./routes/profile');
const paymentRoutes = require('./routes/payments');
const courseRoutes = require('./routes/course');
const walletRoutes = require("./routes/wallets");


// middleware 
app.use(express.json()); // to parse json body
app.use(cookieParser());
app.use(cors());
app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: '/tmp'
    })
)


const PORT = Number(process.env.PORT) || 3001;   // по умолчанию 3001 как в PM2/nginx
const HOST = process.env.HOST || '127.0.0.1';      // ОБЯЗАТЕЛЬНО 0.0.0.0

app.listen(PORT, HOST, () => {
  console.log(`API running on http://${HOST}:${PORT}`);
});

// connections
connectDB();
cloudinaryConnect();

app.get('/health', (_req, res) => res.status(200).send('ok'));
// mount route
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/course', courseRoutes);
app.use('/api/v1/wallets', walletRoutes);




// Default Route
app.get('/', (req, res) => {
    // console.log('Your server is up and running..!');
    res.send(`<div>
    This is Default Route  
    <p>Everything is OK</p>
    </div>`);
})

