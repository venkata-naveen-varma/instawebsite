import express from "express";
 import auth from "../middleware/auth.js";
import upload from "../middleware/multer.js";
import { getMessage, sendMessage } from "../controllers/messageController.js";

const router = express.Router();

router.route('/send/:id').post(auth, sendMessage);
router.route('/all/:id').get(auth, getMessage);
 
export default router;