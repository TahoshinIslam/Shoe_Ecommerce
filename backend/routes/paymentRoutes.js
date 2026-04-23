import express from "express";
import {
  stripeCreate,
  bkashCreate,
  bkashExecute,
  nagadCreate,
  nagadComplete,
  nagadVerifyPayment,
  codCreate,
  getPaymentByOrder,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

// NOTE: Stripe webhook is mounted directly in server.js (raw body required)
// so it is NOT registered here.

const router = express.Router();

router.use(protect);

// Stripe
router.post("/stripe/:orderId", stripeCreate);

// bKash
router.post("/bkash/create/:orderId", bkashCreate);
router.post("/bkash/execute", bkashExecute);

// Nagad
router.post("/nagad/create/:orderId", nagadCreate);
router.post("/nagad/complete", nagadComplete);
router.get("/nagad/verify/:paymentRefId", nagadVerifyPayment);

// Cash on Delivery
router.post("/cod/:orderId", codCreate);

// Payment lookup
router.get("/order/:orderId", getPaymentByOrder);

export default router;
