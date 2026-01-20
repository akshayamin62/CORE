'use client';

import { useEffect, useState, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Program {
  _id: string;
  university: string;
  programName: string;
  campus: string;
  country: string;
  priority?: number;
  intake?: string;
  year?: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
  senderName: string;
  counselorType?: 'PRIMARY' | 'ACTIVE';
  message: string;
  timestamp: string;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
}

interface ChatInfo {
  _id: string;
  participants: {
    student?: Participant;
    counselor?: Participant;
    admin?: Participant;
  };
}

interface ProgramChatViewProps {
  program: Program;
  onClose: () => void;
  userRole: 'STUDENT' | 'COUNSELOR' | 'ADMIN';
}

export default function ProgramChatView({ program, onClose, userRole }: ProgramChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Get current user ID from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUserId(parsedUser._id || parsedUser.id);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchChatAndMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [program._id]);

  const fetchChatAndMessages = async () => {
    try {
      setLoading(true);
      
      // Get or create chat
      const chatResponse = await chatAPI.getOrCreateChat(program._id);
      setChatInfo(chatResponse.data.data.chat);
      
      // Get messages
      const messagesResponse = await chatAPI.getMessages(program._id);
      setMessages(messagesResponse.data.data.messages || []);
    } catch (error: any) {
      console.error('Failed to fetch chat:', error);
      toast.error(error.response?.data?.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(program._id);
      setMessages(response.data.data.messages || []);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await chatAPI.sendMessage(program._id, messageToSend);
      setMessages(prev => [...prev, response.data.data.message]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800';
      case 'COUNSELOR':
        return 'bg-green-100 text-green-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageBubbleColor = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-500 text-white';
      case 'COUNSELOR':
        return 'bg-green-500 text-white';
      case 'ADMIN':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full h-[90vh] flex overflow-hidden">
        {/* Left Panel - Program Details */}
        <div className="w-1/2 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <div className="mb-6">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Programs
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Program Details</h2>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{program.programName}</h3>
                <p className="text-lg text-blue-600 font-semibold">{program.university}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Campus</p>
                  <p className="text-sm font-semibold text-gray-900">{program.campus}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Country</p>
                  <p className="text-sm font-semibold text-gray-900">{program.country}</p>
                </div>
              </div>

              {program.priority && program.intake && program.year && (
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-blue-200">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Priority</p>
                    <p className="text-lg font-bold text-blue-600">{program.priority}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Intake</p>
                    <p className="text-sm font-bold text-green-600">{program.intake}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Year</p>
                    <p className="text-sm font-bold text-purple-600">{program.year}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          {chatInfo && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Chat Participants</h4>
              <div className="space-y-2">
                {chatInfo.participants.student && (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {chatInfo.participants.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{chatInfo.participants.student.name}</p>
                      <p className="text-xs text-gray-500">Student</p>
                    </div>
                  </div>
                )}
                {chatInfo.participants.counselor && (
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {chatInfo.participants.counselor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{chatInfo.participants.counselor.name}</p>
                      <p className="text-xs text-gray-500">Counselor</p>
                    </div>
                  </div>
                )}
                {chatInfo.participants.admin && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {chatInfo.participants.admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{chatInfo.participants.admin.name}</p>
                      <p className="text-xs text-gray-500">Admin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chat */}
        <div className="w-1/2 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">Program Chat</h3>
                <p className="text-sm text-blue-100">Discuss this program with your team</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={messageContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No messages yet</p>
                  <p className="text-gray-400 text-sm mt-1">Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isConsecutive = index > 0 && messages[index - 1].senderId === msg.senderId;
                const isCurrentUser = msg.senderId === currentUserId;
                
                return (
                  <div key={msg._id} className={`flex flex-col ${isConsecutive ? 'mt-1' : 'mt-4'} ${
                    isCurrentUser ? 'items-end' : 'items-start'
                  }`}>
                    {!isConsecutive && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          msg.senderRole === 'STUDENT' ? 'bg-blue-500' :
                          msg.senderRole === 'COUNSELOR' ? 'bg-green-500' :
                          'bg-purple-500'
                        }`}>
                          {msg.senderName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">{msg.senderName}</span>
                          {msg.senderRole === 'COUNSELOR' && msg.counselorType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                              {msg.counselorType === 'PRIMARY' ? 'Primary' : 'Active'}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(msg.senderRole)}`}>
                            {msg.senderRole.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`${isConsecutive ? (isCurrentUser ? 'mr-10' : 'ml-10') : (isCurrentUser ? 'mr-10' : 'ml-10')}`}>
                      <div className={`inline-block max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white' 
                          : msg.senderRole === 'STUDENT' ? 'bg-blue-100 text-gray-900' :
                            msg.senderRole === 'COUNSELOR' ? 'bg-green-100 text-gray-900' :
                            'bg-purple-100 text-gray-900'
                      }`}>
                        <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-1">{formatTimestamp(msg.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type your message..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm text-gray-900"
                  disabled={sending}
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">Press Enter to send, Shift+Enter for new line</p>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
              >
                {sending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Send</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
