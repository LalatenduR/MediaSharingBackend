import {asynchandler} from '../utils/asynchandler.js';
import {apiError} from '../utils/apiError.js';
import {uploadImage} from '../utils/Cloudinary.js';
import {User} from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { response } from 'express';

const generateAccessAndRefreshtoken=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshtoken=refreshToken;
        await user.save({validateBeforeSave:false});
        
        return {accessToken,refreshToken}

    }
    catch(error){
        throw new apiError(500,"Failed to generate tokens");
    }
}

const registerUser=asynchandler(async(req,res)=>{
    const{fullname,email,username,password}=req.body
    console.log("email:",email);
    

    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new apiError(400,"All fields are required");
    }
    
    const existeduser=await User.findOne({
        $or:[
            {email},
            {username}
        ]

    })

    if(existeduser){
        throw new apiError(409,"User already exists");
    }

    const avatarlocalpath=req.files?.avatar[0]?.path;
    const coverimagelocalpath=req.files?.coverImage[0]?.path;

    if(!avatarlocalpath|| avatarlocalpath===undefined){
        throw new apiError(400,"Avatar is required");
    }

    const avatar=await uploadImage(avatarlocalpath)
    const coverimage=await uploadImage(coverimagelocalpath)

    if(!avatarlocalpath){
        throw new apiError(400,"Avatar is required");
    }

    const user=await User.create({
        fullname,
        email,
        username:username.toLowerCase(),
        password,
        avatar:avatar.url,
        coverimage:coverimage?.url || ""
    })

    const createduser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createduser){
        throw new apiError(500,"Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201,"User created",createduser));

})

const loginUser=asynchandler(async(req,res)=>{

    const{email,username,password}=req.body;

    if(!email && !username){
        throw new apiError(400,"Email or username is required");
    }

    const user=await User.findOne({
        $or:[{email},
            {
                username:username?.toLowerCase()
            }
        ]
    });

    if(!user){
        throw new apiError(404,"User not found");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(401,"Invalid user Credentials");
    }
    
    const{accessToken,refreshToken}=await generateAccessAndRefreshtoken(user._id);

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,"User logged in",{
        user:loggedInUser,
        accessToken,
        refreshToken
    }));

})

const logoutUser= asynchandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            },
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200,{},"User Logged out!!"))
})

const refreshAccessToken=asynchandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized");
    }

   try {
     const decodedtoken=jwt.verify(incomingRefreshToken,process.env.REFRESH_JWT_SECRET);
 
     const user = await User.findById(decodedtoken?._id)
 
     if(!user){
         throw new apiError(401,"Invalid refresh token");
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new apiError(401,"Refresh token is expired");
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     const {accessToken,newrefreshToken}=await generateAccessAndRefreshtoken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newrefreshToken,options)
     .json(new ApiResponse(200,"Token refreshed",{accessToken,refreshToken:newrefreshToken}))
   } catch (error) {
         throw new apiError(401,error?.message || "Unauthorized");
    
   }
})

const changeCurrentPassword=asynchandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body;

    const user=await User.findById(req.user?._id);

    const ispasscorrect=await user.isPasswordCorrect(oldPassword);

    if(!ispasscorrect)
    {
        throw new apiError(400,"Invalid password");
    }

    user.password=newPassword;

    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password has been changed Successfully"));
})

const getCurrentUser=asynchandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,res.user,"currentuser fetched successfully");
})

const updateAccountDetails=asynchandler(async(req,res)=>{
    const{fullname,email}=req.body;

    if(!fullname || !email){
        throw new apiError(400,"All fields are required");
    }

    User.findById(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email.toLowerCase()
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,"Account details updated",updatedUser));
})

const updateuseravatar=asynchandler(async(req,res)=>{
    const avatarlocalpath=req.file?.path;
    if(!avatarlocalpath)
    {
        throw new apiError(400,"Avatar is required");
    }
    
    const avatar=await uploadImage(avatarlocalpath);
    if(!avatar.url){
        throw new apiError(400,"Failed to upload avatar");
    }

    const user=await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Avatar image updated"))
})

const updateUserCoverimage=asynchandler(async(req,res)=>{

    const coverlocalpath=req.file?.path;
    if(!coverlocalpath)
    {
        throw new apiError(400,"cover file is missing");
    }
    
    const coverImage=await uploadImage(coverlocalpath);
    if(!coverImage.url){
        throw new apiError(400,"Failed to upload coverImage");
    }

    const user=await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image updated"));
})

const getUserChannelProfile=asynchandler(async(req,res)=>{
    const {username}=req.params;


    if(!username?.trim())
    {
        throw new apiError(400,"Username is missing");
    }

    const channel=await User.aggregate([
        {
            $match:username?.toLowerCase()
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribeTo"
            }
        },{
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubcribedToCount:{
                    $size:"$subscribeTo"
                },
                subscribedTo:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubcribedToCount:1,
                subscribedTo:1,
                avatar:1,
                coverimage:1,
                email:1,
            }
        }
    ])

    if(!channel?.length)
    {
        throw new apiError(404,"channel doesn't exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateuseravatar,
    updateUserCoverimage
}