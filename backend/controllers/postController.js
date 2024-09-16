import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/posts.js";
import { User } from "../models/users.js";
import { Comment } from "../models/comments.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

/**
 * @desc store user posts
 * @route /api/v1/post/addpost
 * @access Private
 */
export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image) return res.status(400).json({ message: 'Image required' });

        // image upload 
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        // buffer to data uri
        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        })

    } catch (error) {
        console.log("Error in postController.addNewPost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc fetch all posts starting with the recent post
 * @route /api/v1/post/all
 * @access Private
 */
export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log("Error in postController.getAllPost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc fetch all user specific posts
 * @route /api/v1/post/userpost/all
 * @access Private
 */
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: 'author',
            select: 'username, profilePicture'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'author',
                select: 'username, profilePicture'
            }
        });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log("Error in postController.getUserPost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc like a user's post
 * @route /api/v1/post/:id/like
 * @access Private
 */
export const likePost = async (req, res) => {
    try {
        const current_userid = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $addToSet: { likes: current_userid } });
        await post.save();

        // implement socket io for real time notification
        // const user = await User.findById(current_userid).select('username profilePicture');
         
        // const postOwnerId = post.author.toString();
        // if(postOwnerId !== current_userid){
        //     // emit a notification event
        //     const notification = {
        //         type:'like',
        //         userId:current_userid,
        //         userDetails:user,
        //         postId,
        //         message:'Your post was liked'
        //     }
        //     const postOwnerSocketId = getReceiverSocketId(postOwnerId);
        //     io.to(postOwnerSocketId).emit('notification', notification);
        // }
        return res.status(200).json({message:'Post liked', success:true});
    } catch (error) {
        console.log("Error in postController.likePost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc dislike a user's post
 * @route /api/v1/post/:id/dislike
 * @access Private
 */
export const dislikePost = async (req, res) => {
    try {
        const current_userid = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $pull: { likes: current_userid } });
        await post.save();

        // implement socket io for real time notification
        // const user = await User.findById(current_userid).select('username profilePicture');
        // const postOwnerId = post.author.toString();
        // if(postOwnerId !== current_userid){
        //     // emit a notification event
        //     const notification = {
        //         type:'dislike',
        //         userId:current_userid,
        //         userDetails:user,
        //         postId,
        //         message:'Your post was liked'
        //     }
        //     const postOwnerSocketId = getReceiverSocketId(postOwnerId);
        //     io.to(postOwnerSocketId).emit('notification', notification);
        // }
        return res.status(200).json({message:'Post disliked', success:true});
    } catch (error) {
        console.log("Error in postController.dislikePost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc Add a comment to a user's post
 * @route /api/v1/post/:id/comment
 * @access Private
 */
export const addComment = async (req,res) =>{
    try {
        const postId = req.params.id;
        const commentKrneWalaUserKiId = req.id;

        const {text} = req.body;

        const post = await Post.findById(postId);

        if(!text) return res.status(400).json({message:'text is required', success:false});

        const comment = await Comment.create({
            text,
            author:commentKrneWalaUserKiId,
            post:postId
        })

        await comment.populate({
            path:'author',
            select:"username profilePicture"
        });
        
        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message:'Comment Added',
            comment,
            success:true
        })

    } catch (error) {
        console.log("Error in postController.addComment(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc get all comments of a specific post
 * @route /api/v1/post/:id/comment/all
 * @access Private
 */
export const getCommentsOfPost = async (req,res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({post:postId}).populate('author', 'username profilePicture');

        if(!comments) return res.status(404).json({message:'No comments found for this post', success:false});

        return res.status(200).json({success:true,comments});

    } catch (error) {
        console.log("Error in postController.getCommentsOfPost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc delete a post
 * @route /api/v1/post/delete/:id
 * @access Private
 */
export const deletePost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});

        // check if the logged-in user is the owner of the post
        if(post.author.toString() !== authorId) return res.status(403).json({message:'Unauthorized'});

        // delete post
        await Post.findByIdAndDelete(postId);

        // remove the post id from the user's post
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // delete associated comments
        await Comment.deleteMany({post:postId});

        return res.status(200).json({
            success:true,
            message:'Post deleted'
        })

    } catch (error) {
        console.log("Error in postController.deletePost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc add or remove a bookmark to a user's post
 * @route /api/v1/post/:id/bookmark
 * @access Private
 */
export const bookmarkPost = async (req,res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message:'Post not found', success:false});
        
        const user = await User.findById(authorId);
        if(user.bookmarks.includes(post._id)){
            // already bookmarked -> remove from the bookmark
            await user.updateOne({$pull:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'unsaved', message:'Post removed from bookmark', success:true});

        }else{
            // bookmark the post
            await user.updateOne({$addToSet:{bookmarks:post._id}});
            await user.save();
            return res.status(200).json({type:'saved', message:'Post bookmarked', success:true});
        }

    } catch (error) {
        cconsole.log("Error in postController.bookmarkPost(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
