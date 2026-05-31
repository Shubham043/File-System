import mongoose from 'mongoose';
// import { ref } from 'node:process';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,  
    required: true,
    trim: true,
  },
  parentId:{
    type : mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default:null
  },
  ancestors:[{
    type : mongoose.Schema.Types.ObjectId,
    ref:'Folder',
  }],
   size: {
    type: Number,
    default: 0,
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
  },
},{timestamps:true});

folderSchema.index({userId:1, parentId:1});
folderSchema.index({ userId: 1 });

export default mongoose.model('Folder', folderSchema);