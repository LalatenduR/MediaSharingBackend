import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getwatchhistory, loginUser, logoutUser, registerUser, updateAccountDetails, updateuseravatar, updateUserCoverimage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authVerify } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controller.js";

const router=Router();
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(authVerify,logoutUser)

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(authVerify,changeCurrentPassword);

router.route("/current-user").get(authVerify,getCurrentUser);

router.route("/update-account").patch(authVerify,updateAccountDetails);

router.route("/avatar").patch(authVerify,upload.single("avatar"),updateuseravatar);

router.route("/cover-image").patch(authVerify,upload.single("/coverImage"),updateUserCoverimage);

router.route("/c/:username").get(authVerify,getUserChannelProfile);

router.route("/history").get(authVerify,getwatchhistory);

export default router;