import express from "express";
import { body } from "express-validator";
import {
  getMyAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validator.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyAddresses);
router.get("/:id", getAddress);

router.post(
  "/",
  [
    body("fullName").trim().notEmpty(),
    body("phone").trim().notEmpty(),
    body("street").trim().notEmpty(),
    body("city").trim().notEmpty(),
    body("postalCode").trim().notEmpty(),
  ],
  validate,
  createAddress,
);

router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

export default router;
