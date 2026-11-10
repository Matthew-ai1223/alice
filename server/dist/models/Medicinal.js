import mongoose, { Schema } from 'mongoose';
const MedicinalSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Medicinal name (tone-marked Yorùbá headword) is required'],
        trim: true,
        index: true,
    },
    ipa: {
        type: String,
        trim: true,
        default: '',
    },
    pos: {
        type: String,
        trim: true,
        default: 'n.',
    },
    category: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    extraFields: {
        type: [
            {
                label: { type: String, trim: true },
                value: { type: String, trim: true },
                _id: false,
            },
        ],
        default: [],
    },
    definition: {
        type: String,
        required: [true, 'English definition / application description is required'],
        trim: true,
    },
    exampleYoruba: {
        type: String,
        trim: true,
        default: '',
    },
    exampleEnglish: {
        type: String,
        trim: true,
        default: '',
    },
    imageUrl: {
        type: String,
        default: null,
    },
    audioUrl: {
        type: String,
        default: null,
    },
    imageMime: {
        type: String,
        default: null,
    },
    audioMime: {
        type: String,
        default: null,
    },
    imageData: {
        type: Buffer,
        select: false,
    },
    audioData: {
        type: Buffer,
        select: false,
    },
    hasAudio: {
        type: Boolean,
        default: false,
        index: true,
    },
    hasPicture: {
        type: Boolean,
        default: false,
        index: true,
    },
    letter: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.imageData;
            delete ret.audioData;
            return ret;
        },
    },
});
// Text search index for searching across Yorùbá name, definition, IPA, and examples
MedicinalSchema.index({
    name: 'text',
    definition: 'text',
    exampleYoruba: 'text',
    exampleEnglish: 'text',
});
export const Medicinal = mongoose.model('Medicinal', MedicinalSchema);
