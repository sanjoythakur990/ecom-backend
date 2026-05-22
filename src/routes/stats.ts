import express from "express";
import { adminOnly } from "../middlewares/auth.js";
import { getBarCharts, getDashboardStats, getLineCharts, getPieCharts } from "../controllers/stats.js";

const app = express.Router();

app.get("/stats", adminOnly, getDashboardStats)
app.get("/bar", adminOnly, getBarCharts)
app.get("/pie", adminOnly, getPieCharts)
app.get("/line", adminOnly, getLineCharts)


export default app;