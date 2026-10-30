import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 60 },
});

const boardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    columns: [columnSchema],
  },
  { timestamps: true }
);

boardSchema.index({ members: 1 });

export default mongoose.model('Board', boardSchema);
