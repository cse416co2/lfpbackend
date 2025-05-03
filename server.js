import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./utils/connectDB.js";
import userRoute from "./routes/userRoutes.js";
import scenarioRoute from "./routes/scenarioRoutes.js";
import investmentRoute from "./routes/investmentRoutes.js";
import eventRoute from "./routes/eventRoutes.js";
import taxRoute from "./routes/taxRoutes.js";
import simulationRoute from "./routes/simulationRoutes.js";
import sharingRoute from "./routes/sharingRoutes.js";
import loggingRoute from "./routes/loggingRoutes.js";

dotenv.config({});

const app = express();

app.get("/home", (req, res) => {
  return res.status(200).json({
    message: "I am coming from backend",
    success: true,
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const corsOptions = {
  origin: "https://lifetimefinancialplanner.netlify.app",
  credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;

app.use("/api/user", userRoute);
app.use("/api/scenario", scenarioRoute);
app.use("/api/investment", investmentRoute);
app.use("/api/event", eventRoute);
app.use("/api/tax", taxRoute);
app.use("/api/simulation", simulationRoute);
app.use("/api/scenarios", sharingRoute);
app.use("/api/logging", loggingRoute);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    connectDB();
    console.log(`Server Running at Port ${PORT}`);
  });
}

/*app.listen(PORT, () => {
  connectDB();
  console.log(`Server Running at Port ${PORT}`);
});*/

export default app;