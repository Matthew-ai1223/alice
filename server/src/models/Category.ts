import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;      // Display name e.g. "Soup (Ọbẹ̀)"
  value: string;     // Slug value e.g. "soup"
  color: string;     // Badge color e.g. "#2ecc71"
  order: number;     // Sort order for display
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category display name is required'],
      trim: true,
    },
    value: {
      type: String,
      required: [true, 'Category value/slug is required'],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    color: {
      type: String,
      default: '#c4953a',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
