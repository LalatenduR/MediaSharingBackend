import {asynchandler} from '../utils/asynchandler.js';
import {apiError} from '../utils/apiError.js';
import {uploadImage} from '../utils/Cloudinary.js';
import {User} from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser=asynchandler(async(req,res)=>{
    res.status(200).json({
        message:"ok"});
    const{fullname,email,username,password}=req.body
    console.log("email:",email);

    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new apiError(400,"All fields are required");
    }
    
    const existeduser=User.findOne({
        $or:[
            {email},
            {username}
        ]

    })

    if(existeduser){
        throw new apiError(409,"User already exists");
    }

    const avatarlocalpath=req.files?.avatar[0]?.path;
    const coverimagelocalpath=req.files?.coverimage[0]?.path;

    if(!avatarlocalpath){
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

    const createduser=await user.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createduser){
        throw new apiError(500,"Failed to create user");
    }

    return res.status(201).json(new ApiResponse(201,"User created",createduser));

})

export {registerUser}