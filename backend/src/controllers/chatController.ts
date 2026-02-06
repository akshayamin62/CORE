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
    } else if (userRole === USER_ROLE.OPS) {
      // OPS must be active or primary OPS for the student
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOpsUserId = (registration?.activeOpsId as any)?.userId;
      const primaryOpsUserId = (registration?.primaryOpsId as any)?.userId;

      const isAuthorized =
        activeOpsUserId?.toString() === userId ||
        primaryOpsUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }
    // SUPER_ADMIN, ADMIN, and COUNSELOR can access all chats for viewing

    // Find or create chat
    let chat = await ProgramChat.findOne({ programId, studentId })
      .populate('participants.student', 'name email')
      .populate('participants.OPS', 'name email')
      .populate('participants.superAdmin', 'name email');

    if (!chat) {
      // Get OPS info
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOps = registration?.activeOpsId as any;
      const primaryOps = registration?.primaryOpsId as any;
      const ops = activeOps || primaryOps;

      // Create new chat
      chat = await ProgramChat.create({
        programId,
        studentId,
        participants: {
          student: studentUserId,
          ops: ops?.userId || undefined,
          superAdmin: undefined, // Will be set when super admin first sends a message
        },
      });

      chat = await ProgramChat.findById(chat._id)
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email');
    } else {
      // Update superAdmin participant if super admin is accessing and not set
      if (userRole === USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
        chat.participants.superAdmin = new mongoose.Types.ObjectId(userId) as any;
        await chat.save();
        chat = await ProgramChat.findById(chat._id)
          .populate('participants.student', 'name email')
          .populate('participants.OPS', 'name email')
          .populate('participants.superAdmin', 'name email');
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
    } else if (userRole === USER_ROLE.OPS) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOpsUserId = (registration?.activeOpsId as any)?.userId;
      const primaryOpsUserId = (registration?.primaryOpsId as any)?.userId;

      const isAuthorized =
        activeOpsUserId?.toString() === userId ||
        primaryOpsUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }
    // SUPER_ADMIN, ADMIN, and COUNSELOR can view all chats

    // Find chat
    const chat = await ProgramChat.findOne({ programId, studentId });
    if (!chat) {
      return res.status(200).json({ success: true, data: { messages: [] } });
    }

    // Get messages sorted by timestamp
    const messages = await ChatMessage.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .limit(500) // Limit to last 500 messages
      .populate('senderId', 'name'); // Populate sender info

    // Map messages to include senderName from populated User
    const messagesWithNames = messages.map(msg => {
      const msgObj: any = msg.toObject();
      // Get name from populated senderId
      if (msgObj.senderId && typeof msgObj.senderId === 'object') {
        msgObj.senderName = msgObj.senderId.name || 'Unknown';
      } else {
        msgObj.senderName = 'Unknown';
      }
      return msgObj;
    });

    return res.status(200).json({
      success: true,
      data: { messages: messagesWithNames },
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

    // Check if user can send messages (only STUDENT, OPS, SUPER_ADMIN)
    if (userRole !== USER_ROLE.STUDENT && userRole !== USER_ROLE.OPS && userRole !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({ 
        success: false,
        message: 'Only students, OPS, and super admin can send messages. Admins and counselors have view-only access.' 
      });
    }

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
    } else if (userRole === USER_ROLE.OPS) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOpsUserId = (registration?.activeOpsId as any)?.userId;
      const primaryOpsUserId = (registration?.primaryOpsId as any)?.userId;

      const isAuthorized =
        activeOpsUserId?.toString() === userId ||
        primaryOpsUserId?.toString() === userId;

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }

    // Find or create chat
    let chat = await ProgramChat.findOne({ programId, studentId });
    if (!chat) {
      // Get OPS info
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOps = registration?.activeOpsId as any;
      const primaryOps = registration?.primaryOpsId as any;
      const ops = activeOps || primaryOps;

      chat = await ProgramChat.create({
        programId,
        studentId,
        participants: {
          student: studentUserId,
          ops: ops?.userId || undefined,
          superAdmin: userRole === USER_ROLE.SUPER_ADMIN ? userId : undefined,
        },
      });
    } else {
      // Update superAdmin participant if super admin is sending and not set
      if (userRole === USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
        chat.participants.superAdmin = new mongoose.Types.ObjectId(userId) as any;
        await chat.save();
      }
    }

    // Determine OPS type if user is a OPS
    let opsType: 'PRIMARY' | 'ACTIVE' | undefined = undefined;
    if (userRole === USER_ROLE.OPS) {
      const registration = await StudentServiceRegistration.findOne({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const activeOpsUserId = (registration?.activeOpsId as any)?.userId;
      const primaryOpsUserId = (registration?.primaryOpsId as any)?.userId;

      if (primaryOpsUserId?.toString() === userId) {
        opsType = 'PRIMARY';
      } else if (activeOpsUserId?.toString() === userId) {
        opsType = 'ACTIVE';
      }
    }

    // Create message
    const newMessage = await ChatMessage.create({
      chatId: chat._id,
      senderId: userId,
      senderRole: userRole,
      opsType,
      message: message.trim(),
      timestamp: new Date(),
      readBy: [userId],
    });

    // Populate sender info for response
    await newMessage.populate('senderId', 'name');
    const messageResponse: any = newMessage.toObject();
    messageResponse.senderName = (newMessage.senderId as any)?.name || userName;

    return res.status(201).json({
      success: true,
      data: { message: messageResponse },
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
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.OPS) {
      // Get chats where user is the OPS
      chats = await ProgramChat.find({ 'participants.OPS': userId })
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.SUPER_ADMIN || userRole === USER_ROLE.ADMIN || userRole === USER_ROLE.COUNSELOR) {
      // SUPER_ADMIN can see all chats, ADMIN and COUNSELOR can view chats (read-only)
      chats = await ProgramChat.find({})
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
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

