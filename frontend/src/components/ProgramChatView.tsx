'use client';

import { useEffect, useState, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { fetchBlobUrl } from '@/lib/useBlobUrl';
import AuthImage from '@/components/AuthImage';
import {
  programChatBubbleMaxClass,
  programChatMessagesClass,
  programChatRootClass,
  programChatRootMobileDefaultClass,
  programChatRootMobileExpandedClass,
} from '@/components/studentDetailResponsive';

interface Program {
  _id: string;
  university: string;
  programName: string;
  campus?: string;
  country: string;
  priority?: number;
  intake?: string;
  year?: string;
}

interface DocumentMeta {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR' | 'ADVISOR';
  senderName: string;
  opsType?: 'PRIMARY' | 'ACTIVE';
  messageType: 'text' | 'document';
  message: string;
  documentMeta?: DocumentMeta;
  savedToExtra: boolean;
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
    OPS?: Participant;
    admin?: Participant;
  };
}

interface ProgramChatViewProps {
  program: Program;
  onClose: () => void;
  userRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR' | 'PARENT' | 'EDUPLAN_COACH' | 'IVY_EXPERT' | 'REFERRER' | 'ADVISOR';
  isReadOnly?: boolean;
  chatType?: 'open' | 'private' | 'notes';
  /** Taller chat area on mobile when program list is hidden */
  mobileExpanded?: boolean;
}

// WhatsApp-style formatting: *bold*, _italic_, __underline__, ~strikethrough~
// Recursive so multiple styles can be combined: *_bold italic_*, *__bold underline__*, etc.
function formatMessage(text: string): React.ReactNode[] {
  // __ must be checked before _ to avoid partial match
  const regex = /(__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = match.index;
    if (token.startsWith('__') && token.endsWith('__')) {
      result.push(<u key={key}>{formatMessage(token.slice(2, -2))}</u>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      result.push(<strong key={key}>{formatMessage(token.slice(1, -1))}</strong>);
    } else if (token.startsWith('_') && token.endsWith('_')) {
      result.push(<em key={key}>{formatMessage(token.slice(1, -1))}</em>);
    } else if (token.startsWith('~') && token.endsWith('~')) {
      result.push(<del key={key}>{formatMessage(token.slice(1, -1))}</del>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

export default function ProgramChatView({
  program,
  onClose,
  userRole,
  isReadOnly = false,
  chatType = 'open',
  mobileExpanded = false,
}: ProgramChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save to extra modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveMessageId, setSaveMessageId] = useState('');
  const [saveDocName, setSaveDocName] = useState('');
  const [saveDocDescription, setSaveDocDescription] = useState('');
  const [savingToExtra, setSavingToExtra] = useState(false);

  // Document preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; filePath: string; mimeType: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewDoc) {
      setPreviewBlobUrl(null);
      return;
    }
    const path = previewDoc.filePath.startsWith('/') ? previewDoc.filePath : `/${previewDoc.filePath}`;
    fetchBlobUrl(path).then(url => setPreviewBlobUrl(url)).catch(() => setPreviewBlobUrl(null));
  }, [previewDoc]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUserId(parsedUser._id || parsedUser.id);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  };

  const prevMessagesLengthRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
    } else if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    fetchChatAndMessages();
    const interval = setInterval(() => { fetchMessages(); }, 3000);
    return () => clearInterval(interval);
  }, [program._id, chatType]);

  const fetchChatAndMessages = async () => {
    try {
      setLoading(true);
      const chatResponse = await chatAPI.getOrCreateChat(program._id, chatType);
      setChatInfo(chatResponse.data.data.chat);
      const messagesResponse = await chatAPI.getMessages(program._id, chatType);
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
      const response = await chatAPI.getMessages(program._id, chatType);
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
      const response = await chatAPI.sendMessage(program._id, messageToSend, chatType);
      setMessages(prev => [...prev, response.data.data.message]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  // Wrap the currently selected text in the textarea with the given marker pair
  const applyFormat = (marker: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = newMessage.slice(0, start);
    const selected = newMessage.slice(start, end);
    const after = newMessage.slice(end);
    const inserted = `${marker}${selected || 'text'}${marker}`;
    setNewMessage(`${before}${inserted}${after}`);
    // Restore focus and highlight the inner text
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + marker.length, start + marker.length + (selected || 'text').length);
    }, 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const response = await chatAPI.uploadDocument(program._id, file, chatType);
      setMessages(prev => [...prev, response.data.data.message]);
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveToExtra = async () => {
    if (!saveDocName.trim()) {
      toast.error('Document name is required');
      return;
    }
    setSavingToExtra(true);
    try {
      await chatAPI.saveToExtra(saveMessageId, saveDocName.trim(), saveDocDescription.trim());
      toast.success('Document saved to Extra Documents');
      setSaveModalOpen(false);
      setSaveDocName('');
      setSaveDocDescription('');
      setSaveMessageId('');
      fetchMessages(); // Refresh to update savedToExtra status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save document');
    } finally {
      setSavingToExtra(false);
    }
  };

  const openSaveModal = (messageId: string, defaultName: string) => {
    setSaveMessageId(messageId);
    setSaveDocName(defaultName);
    setSaveDocDescription('');
    setSaveModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6" />
        </svg>
      );
    }
    if (mimeType.includes('image')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const openPreviewModal = (fileName: string, filePath: string, mimeType: string) => {
    setPreviewDoc({ fileName, filePath, mimeType });
    setPreviewModalOpen(true);
  };

  const handleDocDownload = async (filePath: string) => {
    try {
      const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
      const blobUrl = await fetchBlobUrl(path);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Failed to load document');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800';
      case 'OPS': return 'bg-green-100 text-green-800';
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'ADMIN': return 'bg-orange-100 text-orange-800';
      case 'COUNSELOR': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    const dateStr = date.toLocaleDateString('en-GB');
    return `${dateStr}, ${timeStr}`;
  };

  const canSaveToExtra = userRole === 'OPS' || userRole === 'SUPER_ADMIN';

  const headerGradient =
    chatType === 'notes'
      ? 'bg-linear-to-r from-amber-600 to-orange-600'
      : chatType === 'private'
        ? 'bg-linear-to-r from-teal-600 to-cyan-600'
        : 'bg-linear-to-r from-blue-600 to-indigo-600';

  return (
    <div
      className={`${programChatRootClass} ${
        mobileExpanded ? programChatRootMobileExpandedClass : programChatRootMobileDefaultClass
      }`}
    >
      {/* Save to Extra Modal */}
      {saveModalOpen && (
        <div className="app-modal-overlay fixed inset-0 z-[90] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="app-modal-panel bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save to Extra Documents</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={saveDocName}
                  onChange={(e) => setSaveDocName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Passport Copy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={saveDocDescription}
                  onChange={(e) => setSaveDocDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Brief description of this document..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setSaveModalOpen(false); setSaveDocName(''); setSaveDocDescription(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={savingToExtra}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToExtra}
                disabled={savingToExtra || !saveDocName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingToExtra ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewModalOpen && previewDoc && (
        <div onClick={() => setPreviewModalOpen(false)} className="app-modal-overlay fixed inset-0 z-[90] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="app-modal-panel bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="shrink-0">{getFileIcon(previewDoc.mimeType)}</div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{previewDoc.fileName}</h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {previewDoc.mimeType.includes('image') ? (
                <div className="flex items-center justify-center">
                  <AuthImage
                    path={previewDoc.filePath}
                    alt={previewDoc.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.mimeType.includes('pdf') ? (
                previewBlobUrl ? (
                  <iframe
                    src={previewBlobUrl}
                    className="w-full h-[70vh] rounded-lg shadow-lg"
                    title={previewDoc.fileName}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[70vh]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="shrink-0">{getFileIcon(previewDoc.mimeType)}</div>
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDocDownload(previewDoc.filePath)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className={`${headerGradient} shrink-0 px-3 py-2.5 text-white shadow-md sm:p-4 md:p-6`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-1.5 sm:mb-1 sm:gap-2">
              <h3 className="text-sm font-bold sm:text-base md:text-xl">{chatType === 'notes' ? 'Notes' : chatType === 'private' ? 'Private Chat' : 'Open Chat'}</h3>
              {chatType === 'private' && (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] sm:text-xs">Staff Only</span>
              )}
              {chatType === 'notes' && (
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] sm:text-xs">Super Admin &amp; OPS Only</span>
              )}
            </div>
            <p
              className={`text-[11px] leading-snug sm:text-xs max-md:line-clamp-2 max-md:whitespace-normal md:truncate md:text-sm ${
                chatType === 'notes' ? 'text-amber-100' : chatType === 'private' ? 'text-teal-100' : 'text-blue-100'
              }`}
            >
              {program.programName} - {program.university}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-white transition-all hover:bg-white hover:bg-opacity-20 md:p-2"
            aria-label="Close chat"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={messageContainerRef}
        className={programChatMessagesClass}
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
              <p className="text-gray-700 font-medium">No messages yet</p>
              <p className="text-gray-600 text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const msgSenderId = typeof msg.senderId === 'object' ? (msg.senderId as any)?._id : msg.senderId;
            const prevMsgSenderId = index > 0
              ? (typeof messages[index - 1].senderId === 'object'
                ? (messages[index - 1].senderId as any)?._id
                : messages[index - 1].senderId)
              : null;

            const isConsecutive = index > 0 && prevMsgSenderId === msgSenderId;
            const isCurrentUser = msgSenderId === currentUserId || msgSenderId?.toString() === currentUserId;

            return (
              <div
                key={msg._id}
                className={`flex w-full max-w-full min-w-0 flex-col ${isConsecutive ? 'mt-0.5' : 'mt-3'} ${isCurrentUser ? 'items-end' : 'items-start'}`}
              >
                {!isConsecutive && (
                  <div className={`mb-1 flex w-full max-w-full min-w-0 items-start gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white md:h-8 md:w-8 md:text-sm ${
                        msg.senderRole === 'STUDENT'
                          ? 'bg-blue-500'
                          : msg.senderRole === 'OPS'
                            ? 'bg-green-500'
                            : msg.senderRole === 'SUPER_ADMIN'
                              ? 'bg-purple-500'
                              : msg.senderRole === 'ADMIN'
                                ? 'bg-orange-500'
                                : msg.senderRole === 'COUNSELOR'
                                  ? 'bg-teal-500'
                                  : 'bg-gray-500'
                      }`}
                    >
                      {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className={`min-w-0 flex-1 ${isCurrentUser ? 'text-right' : ''}`}>
                      <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${isCurrentUser ? 'justify-end' : ''}`}>
                        <span className="max-w-full truncate text-xs font-semibold text-gray-900 sm:text-sm">
                          {msg.senderName || 'Unknown'}
                        </span>
                        {msg.senderRole === 'OPS' && msg.opsType && (
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 sm:text-xs">
                            {msg.opsType === 'PRIMARY' ? 'Primary' : 'Secondary'}
                          </span>
                        )}
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs ${getRoleBadgeColor(msg.senderRole)}`}>
                          {msg.senderRole === 'SUPER_ADMIN'
                            ? 'Program Director'
                            : msg.senderRole.charAt(0).toUpperCase() + msg.senderRole.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div
                  className={`${programChatBubbleMaxClass} ${
                    isConsecutive && !isCurrentUser ? 'md:ml-10' : ''
                  } ${isConsecutive && isCurrentUser ? 'md:mr-10' : ''}`}
                >
                  {msg.messageType === 'document' && msg.documentMeta ? (
                    /* Document message */
                    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div
                        className="flex cursor-pointer items-center gap-2 p-2.5 transition-colors hover:bg-gray-50 sm:gap-3 sm:p-3"
                        onClick={() =>
                          openPreviewModal(
                            msg.documentMeta!.fileName,
                            msg.documentMeta!.filePath,
                            msg.documentMeta!.mimeType
                          )
                        }
                      >
                        <div className="shrink-0">{getFileIcon(msg.documentMeta.mimeType)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-900 sm:text-sm">
                            {msg.documentMeta.fileName}
                          </p>
                          <p className="text-[10px] text-gray-500 sm:text-xs">
                            {formatFileSize(msg.documentMeta.fileSize)}
                          </p>
                        </div>
                      </div>
                      <div className="flex border-t border-gray-100">
                        <button
                          onClick={() => handleDocDownload(msg.documentMeta!.filePath)}
                          className="flex-1 py-2 text-center text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 sm:text-xs"
                        >
                          Download
                        </button>
                        {canSaveToExtra && (chatType === 'open' || chatType === 'notes') && (
                          <>
                            <div className="w-px bg-gray-100" />
                            {msg.savedToExtra ? (
                              <span className="flex-1 py-2 text-center text-[11px] font-medium text-green-600 sm:text-xs">
                                ✓ Saved
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  openSaveModal(msg._id, msg.documentMeta!.fileName.replace(/\.[^.]+$/, ''))
                                }
                                className="flex-1 py-2 text-center text-[11px] font-medium text-purple-600 transition-colors hover:bg-purple-50 sm:text-xs"
                              >
                                Save to Extra
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Text message */
                    <div
                      className={`w-fit max-w-full rounded-2xl px-3 py-2 text-sm shadow-sm sm:px-3.5 sm:py-2.5 md:max-w-md md:px-4 md:py-2.5 ${
                        isCurrentUser
                          ? 'rounded-br-md bg-blue-600 text-white'
                          : `rounded-bl-md ${
                              msg.senderRole === 'STUDENT'
                                ? 'bg-white text-gray-900 ring-1 ring-gray-200'
                                : msg.senderRole === 'OPS'
                                  ? 'bg-green-50 text-gray-900 ring-1 ring-green-100'
                                  : msg.senderRole === 'SUPER_ADMIN'
                                    ? 'bg-purple-50 text-gray-900 ring-1 ring-purple-100'
                                    : msg.senderRole === 'ADMIN'
                                      ? 'bg-orange-50 text-gray-900 ring-1 ring-orange-100'
                                      : msg.senderRole === 'COUNSELOR'
                                        ? 'bg-teal-50 text-gray-900 ring-1 ring-teal-100'
                                        : 'bg-white text-gray-900 ring-1 ring-gray-200'
                            }`
                      }`}
                    >
                      <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed select-text">
                        {formatMessage(msg.message)}
                      </p>
                    </div>
                  )}
                  <p
                    className={`mt-0.5 text-[10px] text-gray-500 sm:text-xs ${isCurrentUser ? 'text-right' : 'ml-0.5'}`}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {isReadOnly ? (
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3 md:p-4">
          <p className="text-center text-sm text-gray-500">Chat is in read-only mode</p>
        </div>
      ) : (
        <div className="shrink-0 border-t border-gray-200 bg-white px-2 py-2 max-md:pb-1 md:p-4">
          <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 sm:gap-2 md:space-x-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1 md:mb-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50"
                  title="Attach document"
                >
                  {uploading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>

                <div className="mx-0.5 h-4 w-px bg-gray-200" />

                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFormat('*'); }}
                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 md:text-sm"
                  title="Bold (*text*)"
                >B</button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFormat('_'); }}
                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-xs italic text-gray-600 hover:bg-gray-100 md:text-sm"
                  title="Italic (_text_)"
                >I</button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFormat('__'); }}
                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-xs text-gray-600 underline hover:bg-gray-100 md:text-sm"
                  title="Underline (__text__)"
                >U</button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyFormat('~'); }}
                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-xs text-gray-600 line-through hover:bg-gray-100 md:text-sm"
                  title="Strikethrough (~text~)"
                >S</button>
              </div>
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message..."
                rows={1}
                className="max-h-24 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 md:rounded-xl md:px-4 md:py-3"
                disabled={sending}
              />
              <p className="ml-1 mt-0.5 hidden text-xs text-gray-600 md:block">Press Enter to send & Shift+Enter for new line</p>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:h-auto md:w-auto md:rounded-xl md:px-6 md:py-3 md:text-sm"
              aria-label="Send message"
            >
              {sending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span className="hidden md:inline md:mr-2">Send</span>
                  <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

