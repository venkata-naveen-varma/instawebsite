// import express from "express";
// import auth from "../middleware/auth.js";
// import upload from "../middleware/multer.js";
// import { addComment, addNewPost, bookmarkPost, deletePost, dislikePost, getAllPost, getCommentsOfPost, getUserPost, likePost } from "../controllers/postController.js";

// const router = express.Router();

// router.route("/addpost").post(auth, upload.single('image'), addNewPost);
// router.route("/all").get(auth,getAllPost);
// router.route("/userpost/all").get(auth, getUserPost);
// router.route("/:id/like").get(auth, likePost);
// router.route("/:id/dislike").get(auth, dislikePost);
// router.route("/:id/comment").post(auth, addComment); 
// router.route("/:id/comment/all").post(auth, getCommentsOfPost);
// router.route("/delete/:id").delete(auth, deletePost);
// router.route("/:id/bookmark").get(auth, bookmarkPost);

// export default router;
