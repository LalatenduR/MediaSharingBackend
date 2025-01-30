import { v2 as cloudinary } from 'cloudinary';
import { response } from 'express';
import fs from 'fs';
import dotenv from 'dotenv'
dotenv.config()

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

export const uploadImage = async (filepath) => {

    const uploadResult = await cloudinary.uploader
    .upload(filepath, {
        resource_type: "auto"
    })
    
    .catch((error) => {
        fs.unlinkSync(filepath);
        console.log(error);
    });

    //console.log("Succesfully uploaded",uploadResult.url);
    fs.unlinkSync(filepath);
    return uploadResult;
}