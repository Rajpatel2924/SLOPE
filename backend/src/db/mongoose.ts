import mongoose from "mongoose";
export async function connectDatabase(){const uri=process.env.MONGODB_URI;if(!uri)throw new Error("MONGODB_URI is not configured");if(!/^mongodb(\+srv)?:\/\//.test(uri))throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");await mongoose.connect(uri);console.log("MongoDB connected");}
