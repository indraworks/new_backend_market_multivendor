import express from "express";
import * as C from "../controllers/recommenderController";
const router = express.Router();

///NEW
router.get("/top-products", C.topProducts);
router.get("/top-by-category", C.topByCategory);
router.get("/trending-7d", C.trending7);
router.get("/monthly-top", C.monthlyTop);
router.get("/top-vendors", C.topVendors);
router.post("/custom", C.custom);

///yg beda
router.get("/user-insights/:userId", C.userInsights);
router.get("/vendor-insights/:vendorId", C.vendorInsights);

export default router;
