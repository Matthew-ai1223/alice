import mongoose, { Schema } from 'mongoose';
const CategorySchema = new Schema({
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
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
export const Category = mongoose.model('Category', CategorySchema);
