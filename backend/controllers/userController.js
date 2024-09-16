import { User } from "../models/users.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/posts.js";

/**
 * @desc Register a new user
 * @route POST /api/v1/user/register
 * @access Public
 */
const register = async (req, res)=>{
    try {
        const {username, email, password} = req.body;
        if(!username || !email || !password){
            return res.status(401).json({
                message: "Required user details are missing, please check!",
                success: false
            });
        }
        const user = await User.findOne({email});
        if(user){
            return res.status(401).json({
                message: "User account already exists, try different email.",
                success: false
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({username, email,password:hashedPassword});
        return res.status(201).json({
            message: "Account created successfully.",
            success: true,
        });
    } catch (error) {
        console.log("Error in userController.register(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
}
/**
 * @desc authenticate and cookie user details
 * @route POST /api/v1/user/login
 * @access Public 
*/
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Required user details are missing, please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = await jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

        // populate each post if in the posts array
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }
        return res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log("Error in userController.login(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc clear cookies and logout a user
 * @route GET /api/v1/user/logout
 * @access Public
*/
const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log("Error in userController.logout(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc fetch user profile details
 * @route GET /api/v1/user/:id/profile
 * @access Private
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({path:'posts', createdAt:-1}).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log("Error in userController.getProfile(): ", error);
       return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc update user profile details
 * @route POST /api/v1/user/profile/edit
 * @access Private
 */
const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.log("Error in userController.editProfile(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc provide other users as suggestions (NOT providing personalized suggestions)
 * @route GET /api/v1/user/suggested
 * @access Private
*/
const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password").limit(5);
        if (!suggestedUsers) {
            return res.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log("Error in userController.getSuggestedUsers(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
};
/**
 * @desc follow/unfollow a user
 * @route POST /api/v1/user/followorunfollow/:id
 * @access Private
 */
const followOrUnfollow = async (req, res) => {
    try {
        const current_user_id = req.id;
        const target_user_id = req.params.id; // user you'll follow/unfollow
        if (current_user_id === target_user_id) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(current_user_id);
        const targetUser = await User.findById(target_user_id);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        // check whether to follow or unfollow
        const isFollowing = user.following.includes(target_user_id);
        if (isFollowing) {
            // unfollow logic
            await Promise.all([
                User.updateOne({ _id: current_user_id }, { $pull: { following: target_user_id } }),
                User.updateOne({ _id: target_user_id }, { $pull: { followers: current_user_id } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {
            // follow logic
            await Promise.all([
                User.updateOne({ _id: current_user_id }, { $push: { following: target_user_id } }),
                User.updateOne({ _id: target_user_id }, { $push: { followers: current_user_id } }),
            ])
            return res.status(200).json({ message: 'followed successfully', success: true });
        }
    } catch (error) {
        console.log("Error in userController.followOrUnfollow(): ", error);
        return res.status(400).json({message: "Try again!"});
    }
}

export {
    register,
    login,
    logout,
    getProfile,
    editProfile,
    getSuggestedUsers,
    followOrUnfollow
}