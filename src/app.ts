import express, { type NextFunction, type Request, type Response } from "express";
import { connectDB } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";
import {config} from "dotenv"
import morgan from "morgan"
import Razorpay from "razorpay";
import cors from "cors"

// importing routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/products.js"
import orderRoute from "./routes/order.js"
import paymentRoute from "./routes/payment.js"
import dashboardRoute from "./routes/stats.js"


config({
    path: "./.env"
})

const port = process.env.PORT || 4000;
const mongoURI = process.env.MONGO_URI || "";
// const stripeKey = process.env.STRIPE_KEY || "";
// console.log("PORT :", process.env.PORT);

connectDB(mongoURI as string);
// export const stripe = new Stripe(stripeKey)
export const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY!.toString(),
    key_secret: process.env.RAZORPAY_API_SECRET!.toString()
})
export const myCache = new NodeCache()  // saves cache memory in RAM storage

const app = express();

app.use(express.json());
app.use(morgan("dev"))
app.use(cors())

app.use("/api/v1/user", userRoute)
app.use("/api/v1/product", productRoute)
app.use("/api/v1/order", orderRoute)
app.use("/api/v1/payment", paymentRoute)
app.use("/api/v1/dashboard", dashboardRoute)

app.get("/", (req, res) => {
    res.send("API working!")
})

app.use("/uploads", express.static("uploads"))  // any one can access the files from browser. By providing the route path
app.use(errorMiddleware)

app.listen(port, () => {
    console.log(`Server is working on http://localhost:${port}`);
})