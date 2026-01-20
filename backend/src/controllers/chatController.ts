import { Response } from 'express';
import mongoose from 'mongoose';
import ProgramChat from '../models/ProgramChat';
import ChatMessage from '../models/ChatMessage';
import Program from '../models/Program';
import Student from '../models/Student';
import User from '../models/User';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import { AuthRequest } from '../types/auth';
import { USER_ROLE } from '../types/roles';

// Get or create chat for a program
export const getOrCreateChat = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Find the program and check if it's selected by student
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if program is selected (has priority, intake, year)
    if (!program.priority || !program.intake || !program.year) {
      return res.status(400).json({ message: 'Program must be applied/selected before chatting' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check
    if (userRole === USER_ROLE.STUDENT) {
      // Student can only access their own program chats
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // Counselor must be active or primary counselor for the student
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselorUserId = (registration?.activeCounselorId as any)?.userId;
      const primaryCounselorUserId = (registration?.primaryCounselorId as any)?.userId;

      const isAuthorized =
        activeCounselorUserId?.toString() === userId ||
        primaryCounselorUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the counselor for this student' });
      }
    }
    // Admin can access all chats (no check needed)

    // Find or create chat
    let chat = await ProgramChat.findOne({ programId, studentId })
      .populate('participants.student', 'name email')
      .populate('participants.counselor', 'name email')
      .populate('participants.admin', 'name email');

    if (!chat) {
      // Get counselor info
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselor = registration?.activeCounselorId as any;
      const primaryCounselor = registration?.primaryCounselorId as any;
      const counselor = activeCounselor || primaryCounselor;

      // Create new chat
      chat = await ProgramChat.create({
        programId,
        studentId,
        participants: {
          student: studentUserId,
          counselor: counselor?.userId || undefined,
          admin: undefined, // Will be set when admin first joins
        },
      });

      chat = await ProgramChat.findById(chat._id)
        .populate('participants.student', 'name email')
        .populate('participants.counselor', 'name email')
        .populate('participants.admin', 'name email');
    } else {
      // Update admin participant if admin is accessing and not set
      if (userRole === USER_ROLE.ADMIN && !chat.participants.admin) {
        chat.participants.admin = new mongoose.Types.ObjectId(userId) as any;
        await chat.save();
        chat = await ProgramChat.findById(chat._id)
          .populate('participants.student', 'name email')
          .populate('participants.counselor', 'name email')
          .populate('participants.admin', 'name email');
      }
    }

    return res.status(200).json({
      success: true,
      data: { chat },
    });
  } catch (error: any) {
    console.error('Get or create chat error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all messages for a chat
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Find the program
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check (same as getOrCreateChat)
    if (userRole === USER_ROLE.STUDENT) {
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselorUserId = (registration?.activeCounselorId as any)?.userId;
      const primaryCounselorUserId = (registration?.primaryCounselorId as any)?.userId;

      const isAuthorized =
        activeCounselorUserId?.toString() === userId ||
        primaryCounselorUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the counselor for this student' });
      }
    }

    // Find chat
    const chat = await ProgramChat.findOne({ programId, studentId });
    if (!chat) {
      return res.status(200).json({ success: true, data: { messages: [] } });
    }

    // Get messages sorted by timestamp
    const messages = await ChatMessage.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .limit(500); // Limit to last 500 messages

    return res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const { message } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // Get user name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userName = user.name;

    // Find the program
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check
    if (userRole === USER_ROLE.STUDENT) {
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselorUserId = (registration?.activeCounselorId as any)?.userId;
      const primaryCounselorUserId = (registration?.primaryCounselorId as any)?.userId;

      const isAuthorized =
        activeCounselorUserId?.toString() === userId ||
        primaryCounselorUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the counselor for this student' });
      }
    }

    // Find or create chat
    let chat = await ProgramChat.findOne({ programId, studentId });
    if (!chat) {
      // Get counselor info
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselor = registration?.activeCounselorId as any;
      const primaryCounselor = registration?.primaryCounselorId as any;
      const counselor = activeCounselor || primaryCounselor;

      chat = await ProgramChat.create({
        programId,
        studentId,
        participants: {
          student: studentUserId,
          counselor: counselor?.userId || undefined,
          admin: userRole === USER_ROLE.ADMIN ? userId : undefined,
        },
      });
    }

    // Determine counselor type if user is a counselor
    let counselorType: 'PRIMARY' | 'ACTIVE' | undefined = undefined;
    if (userRole === USER_ROLE.COUNSELOR) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeCounselorId', 'userId')
        .populate('primaryCounselorId', 'userId');

      const activeCounselorUserId = (registration?.activeCounselorId as any)?.userId;
      const primaryCounselorUserId = (registration?.primaryCounselorId as any)?.userId;

      if (primaryCounselorUserId?.toString() === userId) {
        counselorType = 'PRIMARY';
      } else if (activeCounselorUserId?.toString() === userId) {
        counselorType = 'ACTIVE';
      }
    }

    // Create message
    const newMessage = await ChatMessage.create({
      chatId: chat._id,
      senderId: userId,
      senderRole: userRole,
      senderName: userName,
      counselorType,
      message: message.trim(),
      timestamp: new Date(),
      readBy: [userId],
    });

    return res.status(201).json({
      success: true,
      data: { message: newMessage },
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all chats for current user
export const getMyChatsList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let chats;

    if (userRole === USER_ROLE.STUDENT) {
      // Get chats where user is the student
      chats = await ProgramChat.find({ 'participants.student': userId })
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.counselor', 'name email')
        .populate('participants.admin', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // Get chats where user is the counselor
      chats = await ProgramChat.find({ 'participants.counselor': userId })
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.counselor', 'name email')
        .populate('participants.admin', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.ADMIN) {
      // Get all chats or chats where admin participated
      chats = await ProgramChat.find({})
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.counselor', 'name email')
        .populate('participants.admin', 'name email')
        .sort({ updatedAt: -1 })
        .limit(100); // Limit for admins
    }

    return res.status(200).json({
      success: true,
      data: { chats },
    });
  } catch (error: any) {
    console.error('Get my chats list error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
