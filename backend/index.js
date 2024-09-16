import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/userRoutes.js";
// import postRoute from "./routes/psotRoutes.js";
// import messageRoute from "./routes/messageRoutes.js";
// import { app, server } from "./socket/socket.js";
import path from "path";
 
dotenv.config({});

const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

const app = express();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
    origin: process.env.URL,
    credentials: true
}
app.use(cors(corsOptions));

app.use("/api/v1/user", userRoute);
// app.use("/api/v1/post", postRoute);
// app.use("/api/v1/message", messageRoute);

app.use(express.static(path.join(__dirname, "/frontend/dist")));
app.get("*", (req,res)=>{
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
})

app.get('/', (req, res)=>{
    res.json({msg:"working"});
});

app.listen(PORT, () => {
    connectDB();
    console.log(`Server running on port ${PORT}`);
});