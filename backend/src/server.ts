import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import formAnswerRoutes from "./routes/formAnswerRoutes";
import studentRoutes from "./routes/studentRoutes";
import adminStudentRoutes from "./routes/adminStudentRoutes";
import programRoutes from "./routes/programRoutes";
import chatRoutes from "./routes/chatRoutes";
import documentRoutes from "./routes/documentRoutes";
import ksDocumentRoutes from "./routes/ksDocumentRoutes";

// Import all models to register them with Mongoose
import "./models/User";
import "./models/Student";
import "./models/Counselor";
import "./models/Service";
import "./models/FormPart";
import "./models/ServiceFormPart";
import "./models/FormSection";
import "./models/FormSubSection";
import "./models/FormField";
import "./models/StudentServiceRegistration";
import "./models/StudentFormAnswer";
import "./models/Program";
import "./models/ProgramChat";
import "./models/ChatMessage";
import "./models/StudentDocument";
import "./models/KSDocumentField";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.use("/api/auth", authRoutes);
app.use("/api/admin/students", adminStudentRoutes); // More specific route must come first
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/forms", formAnswerRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ks-documents", ksDocumentRoutes);

// Basic test route
app.get('/', (_req, res) => {
  res.send('API is running!');
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      // These options work well for both local and Atlas MongoDB
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log('✅ Connected to MongoDB successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

export default app;