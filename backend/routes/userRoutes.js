import express from "express";
import { editProfile, followOrUnfollow, getProfile, getSuggestedUsers, login, logout, register } from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/logout').get(logout);
router.route('/:id/profile').get(auth, getProfile);
router.route('/profile/edit').post(auth, upload.single('profilePicture'), editProfile);
router.route('/suggested').get(auth, getSuggestedUsers);
router.route('/followorunfollow/:id').post(auth, followOrUnfollow);

export default router;