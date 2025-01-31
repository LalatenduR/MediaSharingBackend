import {asynchandler} from '../utils/asynchandler.js';
import {apiError} from '../utils/apiError.js';
import {uploadImage} from '../utils/Cloudinary.js';
import {User} from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const  generateAccessAndRefreshtoken=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const accestoken=user.generateAccessToken
        const refreshtoken=user.generateRefreshToken

        user.refreshtoken=refreshtoken;
        await user.save({validateBeforeSave:false});
        
        return {accestoken,refreshtoken}

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

    const loggedInUser=User.findById(user._id);
    select("-password -refreshToken");

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
    User.findByIdAndUpdate(
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


export {registerUser,loginUser,logoutUser}