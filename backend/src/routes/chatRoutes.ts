import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  getMyChatsList,
} from '../controllers/chatController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all chats for current user
router.get('/my-chats', getMyChatsList);

// Get or create chat for a program
router.get('/program/:programId/chat', getOrCreateChat);

// Get all messages for a program
router.get('/program/:programId/messages', getChatMessages);

// Send a message
router.post('/program/:programId/messages', sendMessage);

export default router;

