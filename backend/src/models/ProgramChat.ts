import mongoose, { Document, Schema } from 'mongoose';

export interface IProgramChat extends Document {
  programId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  participants: {
    student: mongoose.Types.ObjectId;
    OPS?: mongoose.Types.ObjectId;
    superAdmin?: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProgramChatSchema = new Schema<IProgramChat>(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    participants: {
      student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      OPS: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      superAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one chat per program-student combination
ProgramChatSchema.index({ programId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IProgramChat>('ProgramChat', ProgramChatSchema);

