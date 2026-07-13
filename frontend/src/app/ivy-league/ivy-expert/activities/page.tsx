'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import { IVY_API_URL } from '@/lib/ivyApi';
import { useBlobUrl, fetchBlobUrl, fileApi } from '@/lib/useBlobUrl';
import { ProtectedActivityDocumentPanel } from '@/components/ProtectedActivityDocumentViewer';
import {
  ivyPointerActivityCardClass,
  ivyPointerActivityTitleClass,
  ivyPointerActivitiesShellClass,
  ivyPointerActivitiesOuterPadClass,
  ivyPointerActivitiesPageTitleClass,
  ivyPointerActivitiesTabsClass,
  ivyPointerActivitiesTabBtnClass,
  ivyPointerAssignedActivityCardClass,
  ivyPointerActivityMetaRowClass,
  ivyPointerActivityDeadlineTextClass,
  ivyPointerActivityEvaluateTitleRowClass,
  ivyPointerActivityProgressTrackClass,
  ivyPointerActivityProgressBarClass,
  ivyPointerDeadlinePanelClass,
  ivyPointerCountdownBlockClass,
  ivyPointerCountdownRowClass,
  ivyPointerCountdownUnitClass,
  ivyPointerCountdownValueClass,
  ivyPointerDeadlineUpdateRowClass,
  ivyPointerDeadlineInputClass,
  ivyPointerDeadlineUpdateBtnClass,
  ivyPointerActivityTaskRowClass,
  ivyPointerActivityTaskChatBtnClass,
  ivyPointerActivityTaskSelectClass,
  ivyPointerOverdueRibbonClass,
  ivyPointerOverdueBadgeClass,
  ivyPointerRefreshRowClass,
  ivyPointerRefreshBtnClass,
  ivyPointerSelectActivitiesBtnClass,
  ivyPointerConversationOverlayClass,
  ivyPointerConversationHeaderClass,
  ivyPointerConversationMobileBarClass,
  ivyPointerConversationBackBtnClass,
  ivyPointerConversationShellClass,
  ivyPointerConversationGridClass,
  ivyPointerConversationMessagesClass,
  ivyPointerConversationInputClass,
  ivyPointerConversationTabsClass,
  ivyPointerConversationTabBtnClass,
  ivyPointerConversationComposerClass,
} from '@/components/studentDetailResponsive';

function InlineDocViewer({ url, onClose }: { url: string, onClose: () => void }) {
  return <ProtectedActivityDocumentPanel url={url} onClose={onClose} />;
}

interface DocumentTask {
  title: string;
  page?: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface IvyExpertDocument {
  url: string;
  tasks: DocumentTask[];
}

// Conversation Window Component for Ivy Expert
function ConversationWindow({ 
  activityTitle, 
  task, 
  activityId,
  studentIvyServiceId,
  onClose,
  ivyExpertId
}: { 
  activityTitle: string; 
  task: DocumentTask; 
  activityId: string;
  studentIvyServiceId: string;
  onClose: () => void;
  ivyExpertId: string;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [messageType, setMessageType] = useState<'feedback' | 'action' | 'resource' | 'normal'>('normal');
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef(0);

  const getFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
    if (['pdf'].includes(ext || '')) return 'pdf';
    return 'document';
  };

  const handleFileClick = async (url: string, name: string) => {
    const fileType = getFileType(name);
    try {
      const blobUrl = await fetchBlobUrl(url);
      setPreviewFile({ url: blobUrl, name, type: fileType });
    } catch {
      console.error('Failed to load file preview');
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Fetch conversation messages from API with real-time polling
  useEffect(() => {
    // Keep ref in sync
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${IVY_API_URL}/task/conversation`, {
          params: {
            selectionId: activityId,
            taskTitle: task.title,
            taskPage: task.page,
          },
        });
        if (response.data.success) {
          const msgs = response.data.data.messages || [];
          setMessages(msgs);
          messagesLengthRef.current = msgs.length;
          // Scroll to bottom after messages are set
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchConversation();

    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(() => {
      axios.get(`${IVY_API_URL}/task/conversation`, {
        params: {
          selectionId: activityId,
          taskTitle: task.title,
          taskPage: task.page,
        },
      })
      .then(async response => {
        if (response.data.success) {
          const newMessages = response.data.data.messages || [];
          // Compare with ref to avoid stale closure issues
          if (newMessages.length !== messagesLengthRef.current) {
            setMessages(newMessages);
            messagesLengthRef.current = newMessages.length;
          }
        }
      })
      .catch(error => {
        console.error('Error polling conversation:', error);
      });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activityId, task.title, task.page, ivyExpertId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    try {
      const formData = new FormData();
      formData.append('studentIvyServiceId', studentIvyServiceId);
      formData.append('selectionId', activityId);
      formData.append('taskTitle', task.title);
      formData.append('taskPage', String(task.page));
      formData.append('sender', 'ivyExpert');
      formData.append('senderName', 'Ivy Expert');
      formData.append('text', newMessage.trim() || ' ');
      formData.append('messageType', messageType);
      
      if (attachedFile) {
        formData.append('file', attachedFile);
      }

      const response = await axios.post(`${IVY_API_URL}/task/conversation/message`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const msgs = response.data.data.messages || [];
        setMessages(msgs);
        messagesLengthRef.current = msgs.length;
        setNewMessage('');
        setAttachedFile(null);
        setMessageType('normal');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className={ivyPointerConversationShellClass}>
      <div className={ivyPointerConversationGridClass}>
        <div className={ivyPointerConversationHeaderClass}>
          <div className={ivyPointerConversationMobileBarClass}>
            <button type="button" onClick={onClose} className={ivyPointerConversationBackBtnClass}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-600">Student Chat</span>
            <span className="shrink-0 rounded-md bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700">
              Active
            </span>
          </div>

          <div className="px-6 py-4 max-md:px-3 max-md:py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="mb-1 text-xl font-bold text-gray-900 max-md:text-base max-md:leading-snug">{activityTitle}</h2>
                <p className="text-sm text-gray-500 max-md:text-xs">Spike in One Area</p>
              </div>
              <button
                onClick={onClose}
                className="ml-4 shrink-0 rounded-full p-2 transition-colors hover:bg-gray-100 max-md:hidden"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 hidden items-center justify-between md:flex">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-green-600">ADMIN ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className={ivyPointerConversationMessagesClass}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg._id || index} className={`flex ${msg.sender === 'ivyExpert' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${msg.sender === 'ivyExpert' ? 'order-2' : 'order-1'}`}>
                  {msg.messageType === 'feedback' && msg.sender === 'ivyExpert' ? (
                    // Feedback message from Ivy Expert
                    <div className="bg-brand-500 text-white rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">Feedback</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-brand-400/30 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-brand-400/40 transition-colors`}
                        >
                          <div className="p-2 bg-brand-400 rounded">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-brand-100">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'feedback' && msg.sender === 'student' ? (
                    // Advice message from student
                    <div className="bg-white border-2 border-green-200 rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Get Advice</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-green-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-green-100 transition-colors`}
                        >
                          <div className="p-2 bg-green-100 rounded">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'action' && msg.sender === 'ivyExpert' ? (
                    // Action Suggested message from Ivy Expert
                    <div className="bg-white border-2 border-brand-200 rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Action Suggested</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-brand-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-brand-100 transition-colors`}
                        >
                          <div className="p-2 bg-brand-100 rounded">
                            <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'resource' && msg.sender === 'ivyExpert' ? (
                    // Resource message from Ivy Expert
                    <div className="bg-white border-2 border-brand-200 rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Resource</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-brand-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-brand-100 transition-colors`}
                        >
                          <div className="p-2 bg-brand-100 rounded">
                            <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'resource' && msg.sender === 'student' ? (
                    // Resource message from student
                    <div className="bg-white border-2 border-brand-200 rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Resource</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-brand-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-brand-100 transition-colors`}
                        >
                          <div className="p-2 bg-brand-100 rounded">
                            <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular message
                    <div className={`rounded-2xl px-4 py-3 ${msg.sender === 'ivyExpert' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {msg.text.trim() && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${msg.sender === 'ivyExpert' ? 'bg-brand-400/30' : 'bg-white'}`}
                        >
                          <div className={`p-2 rounded ${msg.sender === 'ivyExpert' ? 'bg-brand-400' : 'bg-red-100'}`}>
                            <svg className={`w-5 h-5 ${msg.sender === 'ivyExpert' ? 'text-white' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${msg.sender === 'ivyExpert' ? 'text-white' : 'text-gray-900'}`}>
                              {msg.attachment.name}
                            </p>
                            <p className={`text-xs ${msg.sender === 'ivyExpert' ? 'text-brand-100' : 'text-gray-500'}`}>
                              {msg.attachment.size}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'ivyExpert' ? 'text-right' : 'text-left'}`}>
                    {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={ivyPointerConversationInputClass}>
          {/* Message Type Tabs */}
          <div className={ivyPointerConversationTabsClass}>
            <button
              onClick={() => setMessageType('normal')}
              className={`${ivyPointerConversationTabBtnClass} ${
                messageType === 'normal'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setMessageType('feedback')}
              className={`${ivyPointerConversationTabBtnClass} ${
                messageType === 'feedback'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Feedback
            </button>
            <button
              onClick={() => setMessageType('action')}
              className={`${ivyPointerConversationTabBtnClass} ${
                messageType === 'action'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Action
            </button>
            <button
              onClick={() => setMessageType('resource')}
              className={`${ivyPointerConversationTabBtnClass} ${
                messageType === 'resource'
                  ? 'bg-brand-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resource
            </button>
          </div>
          {attachedFile && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-brand-100 rounded">
                <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{attachedFile.name}</p>
                <p className="text-xs text-gray-500">{(attachedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className={ivyPointerConversationComposerClass}>
            {/* Photos/Videos Upload Button */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    setMessageType('resource');
                  }
                };
                input.click();
              }}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach photo or video"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Files Upload Button */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    setMessageType('resource');
                  }
                };
                input.click();
              }}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write structured feedback..."
              rows={1}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 resize-none overflow-y-auto focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 max-md:py-1.5 md:px-4 md:py-2.5"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && !attachedFile}
              className="p-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="mt-2 hidden text-center text-xs text-gray-400 md:block">Sending as &quot;Advanced Ivy Expert&quot; mode</p>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="relative max-w-6xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
              </div>
              
              <div className="p-4 max-h-[calc(90vh-100px)] overflow-auto">
                {previewFile.type === 'image' && (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full h-auto mx-auto" />
                )}
                {previewFile.type === 'video' && (
                  <video src={previewFile.url} controls className="max-w-full h-auto mx-auto" />
                )}
                {previewFile.type === 'pdf' && (
                  <iframe src={previewFile.url} className="w-full h-[calc(90vh-150px)]" title={previewFile.name} />
                )}
                {previewFile.type === 'document' && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    <a
                      href={previewFile.url}
                      download={previewFile.name}
                      className="inline-flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AgentSuggestion {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  pointerNo: number;
  source?: string;
  documentUrl?: string | null;
  documentName?: string | null;
  tasks?: { title: string; page?: number }[];
}

interface StudentActivity {
  selectionId: string;
  suggestion?: AgentSuggestion;
  pointerNo: number;
  title: string;
  description: string;
  tags: string[];
  selectedAt: string;
  weightage?: number; // Weightage for Pointers 2, 3, 4
  deadline?: string; // Deadline for countdown
  ivyExpertDocuments?: IvyExpertDocument[]; // Documents with tasks
  proofUploaded: boolean;
  submission: {
    _id: string;
    files: string[];
    remarks?: string;
    submittedAt: string;
  } | null;
  evaluated: boolean;
  evaluation: {
    _id: string;
    score: number;
    feedback?: string;
    evaluatedAt: string;
  } | null;
}

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIvyServiceId = searchParams.get('studentIvyServiceId');
  const ivyExpertId = searchParams.get('ivyExpertId') || (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')._id || ''; } catch { return ''; }
  })();

  const [selectedPointer, setSelectedPointer] = useState<number | ''>(() => {
    const p = searchParams.get('pointerNo');
    return p ? parseInt(p) : 2;
  });

  useEffect(() => {
    const p = searchParams.get('pointerNo');
    if (p) {
      setSelectedPointer(parseInt(p));
    }
  }, [searchParams]);
  // Admin activities from super-admin (replaces agent suggestions)
  const [adminActivities, setAdminActivities] = useState<AgentSuggestion[]>([]);
  const [loadingAdminActivities, setLoadingAdminActivities] = useState<boolean>(false);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [activityWeightages, setActivityWeightages] = useState<Record<string, number>>({});
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);
  const [selectingActivities, setSelectingActivities] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'evaluate'>('suggestions');
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [viewingIvyExpertDocUrl, setViewingIvyExpertDocUrl] = useState<string | null>(null);
  const [viewingDocumentForActivity, setViewingDocumentForActivity] = useState<string | null>(null); // Store activity ID
  const [selectedTask, setSelectedTask] = useState<{ activityTitle: string; task: DocumentTask; activityId: string } | null>(null);
  const [dropdownValue, setDropdownValue] = useState<string>(''); // Controlled dropdown state
  const [portalMounted, setPortalMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Real-time countdown timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Deadline state per suggestion (keyed by suggestion._id, used during selection)
  const [activityDeadlines, setActivityDeadlines] = useState<Record<string, string>>({});
  // Deadline update state for evaluate tab (keyed by selectionId)
  const [deadlineInputs, setDeadlineInputs] = useState<Record<string, string>>({});
  const [savingDeadline, setSavingDeadline] = useState<string | null>(null);

  const handleSetDeadline = async (selectionId: string) => {
    const deadline = deadlineInputs[selectionId];
    if (!deadline) return;
    setSavingDeadline(selectionId);
    try {
      const response = await axios.post(`${IVY_API_URL}/pointer/activity/deadline`, {
        selectionId,
        ivyExpertId,
        deadline,
      });
      if (response.data.success) {
        setStudentActivities(prev => prev.map(act =>
          act.selectionId === selectionId ? { ...act, deadline: response.data.data.deadline } : act
        ));
        setMessage({ type: 'success', text: 'Deadline updated successfully!' });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update deadline' });
    } finally {
      setSavingDeadline(null);
    }
  };

  const getCountdown = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - currentTime.getTime();
    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { expired: false, days, hours, minutes, seconds };
  };

  // Update URL when conversation opens/closes
  const handleTaskClick = async (activityTitle: string, task: DocumentTask, activityId: string) => {
    setSelectedTask({ activityTitle, task, activityId });
    
    const params = new URLSearchParams(window.location.search);
    params.set('conversationOpen', 'true');
    params.set('taskSelectionId', activityId);
    params.set('taskTitle', task.title);
    if (task.page != null) {
      params.set('taskPage', String(task.page));
    } else {
      params.delete('taskPage');
    }
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCloseConversation = () => {
    setSelectedTask(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('conversationOpen');
    params.delete('taskSelectionId');
    params.delete('taskTitle');
    params.delete('taskPage');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (searchParams.get('conversationOpen') !== 'true') {
      setSelectedTask(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('conversationOpen') !== 'true' || selectedTask) {
      return;
    }

    const taskSelectionId = searchParams.get('taskSelectionId');
    const taskTitle = searchParams.get('taskTitle');
    if (!taskSelectionId || !taskTitle) {
      return;
    }

    const taskPageParam = searchParams.get('taskPage');
    const taskPage = taskPageParam ? Number(taskPageParam) : undefined;

    const activity = studentActivities.find((act) => act.selectionId === taskSelectionId);
    const activityTitle = activity?.title || 'Activity';

    let matchedTask: DocumentTask | undefined;
    if (activity?.ivyExpertDocuments) {
      for (const doc of activity.ivyExpertDocuments) {
        matchedTask = doc.tasks.find(
          (t) =>
            t.title === taskTitle &&
            (taskPageParam == null || t.page === taskPage)
        );
        if (matchedTask) break;
      }
    }

    setSelectedTask({
      activityTitle,
      task: matchedTask || {
        title: taskTitle,
        page: taskPage,
        status: 'not-started',
      },
      activityId: taskSelectionId,
    });
  }, [searchParams, studentActivities, selectedTask]);

  const fetchStudentActivities = async () => {
    const studentId = searchParams.get('studentId');
    const svcId = searchParams.get('studentIvyServiceId');
    if (!studentId) return;

    setLoadingActivities(true);
    try {
      const response = await axios.get(
        `${IVY_API_URL}/pointer/activity/student/${studentId}`,
        { params: { studentIvyServiceId: svcId } }
      );
      if (response.data.success) {
        const payload = response.data.data;
        const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];

        const activitiesData = rawActivities.map((act: any) => ({
          ...act,
          title: act.suggestion?.title || 'Untitled Activity',
          description: act.suggestion?.description || '',
          tags: act.suggestion?.tags || []
        }));

        setStudentActivities(activitiesData);
        
        // Load weightages from database
        const weightagesFromDb: Record<string, number> = {};
        activitiesData.forEach((act: StudentActivity) => {
          if (act.suggestion?._id && act.weightage !== undefined && act.weightage !== null) {
            weightagesFromDb[act.suggestion._id] = act.weightage;
          }
        });
        setActivityWeightages(prev => ({ ...prev, ...weightagesFromDb }));
      }
    } catch (error: any) {
      console.error('Error fetching student activities:', error);
      console.error('Error details:', {
        url: `${IVY_API_URL}/pointer/activity/student/${studentId}`,
        status: error.response?.status,
        message: error.message
      });
      // Don't show error to user if student simply has no activities yet
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (!studentIvyServiceId) return;
    if (activeTab === 'evaluate') {
      fetchStudentActivities();
    }
  }, [studentIvyServiceId, searchParams, activeTab]);

  useEffect(() => {
    if (!studentIvyServiceId) return;

    const initData = async () => {
      setLoadingActivities(true);
      try {
        const studentId = searchParams.get('studentId');
        if (studentId) {
          try {
            const activitiesResponse = await axios.get(`${IVY_API_URL}/pointer/activity/student/${studentId}`, { params: { studentIvyServiceId } });
            if (activitiesResponse.data.success) {
              const payload = activitiesResponse.data.data;
              const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];

              const activitiesData = rawActivities.map((act: any) => ({
                ...act,
                title: act.suggestion?.title || 'Untitled Activity',
                description: act.suggestion?.description || '',
                tags: act.suggestion?.tags || []
              }));

              setStudentActivities(activitiesData);

              const assignedIds = new Set<string>();
              const weightagesFromDb: Record<string, number> = {};
              const deadlinesFromDb: Record<string, string> = {};
              activitiesData.forEach((act: StudentActivity) => {
                if (act.suggestion?._id) {
                  assignedIds.add(act.suggestion._id);
                  // Load weightage from database if available
                  if (act.weightage !== undefined && act.weightage !== null) {
                    weightagesFromDb[act.suggestion._id] = act.weightage;
                  }
                  // Load deadline from database if available
                  if (act.deadline) {
                    deadlinesFromDb[act.suggestion._id] = new Date(act.deadline).toISOString().slice(0, 16);
                  }
                }
              });
              setSelectedActivities(assignedIds);
              setActivityWeightages(weightagesFromDb);
              setActivityDeadlines(deadlinesFromDb);
            }
          } catch (activityError: any) {
            console.error("Error fetching activities:", activityError);
            // Don't fail the whole init if activities fetch fails
            // Student might not have any activities yet
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoadingActivities(false);
      }
    };

    initData();
  }, [studentIvyServiceId, searchParams]);

  // Fetch super-admin activities for the selected pointer
  const fetchAdminActivities = async () => {
    if (!selectedPointer) return;
    setLoadingAdminActivities(true);
    try {
      const response = await axios.get(`${IVY_API_URL}/activities`, {
        params: { pointerNo: selectedPointer }
      });
      if (response.data.success) {
        setAdminActivities(response.data.data || []);
      } else {
        setAdminActivities([]);
      }
    } catch (error: any) {
      console.error('Error fetching admin activities:', error);
      setAdminActivities([]);
    } finally {
      setLoadingAdminActivities(false);
    }
  };

  useEffect(() => {
    if (selectedPointer) {
      fetchAdminActivities();
    }
  }, [selectedPointer]);

  const handleToggleActivity = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    const updatedWeightages = { ...activityWeightages };
    const updatedDeadlines = { ...activityDeadlines };
    
    if (newSelected.has(activityId)) {
      // Removing activity
      newSelected.delete(activityId);
      delete updatedWeightages[activityId];
      delete updatedDeadlines[activityId];
    } else {
      // Adding activity
      newSelected.add(activityId);
      // Auto-assign weightage for Pointers 2, 3, 4
      if ([2, 3, 4].includes(selectedPointer as number)) {
        // Count only selections from current pointer's admin activities
        const currentPointerAdminIds = new Set(adminActivities.map(a => a._id));
        const currentPointerCount = Array.from(newSelected).filter(id => currentPointerAdminIds.has(id)).length;
        if (currentPointerCount === 1) {
          updatedWeightages[activityId] = 100;
        } else {
          // Distribute evenly among current pointer selections
          const equalWeight = Math.floor(100 / currentPointerCount);
          const remainder = 100 - (equalWeight * currentPointerCount);
          let index = 0;
          newSelected.forEach(actId => {
            if (currentPointerAdminIds.has(actId)) {
              updatedWeightages[actId] = index === 0 ? equalWeight + remainder : equalWeight;
              index++;
            }
          });
        }
      }
    }
    
    setSelectedActivities(newSelected);
    setActivityWeightages(updatedWeightages);
    setActivityDeadlines(updatedDeadlines);
  };

  const handleWeightageChange = async (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newWeightages = { ...activityWeightages, [id]: numValue };
    setActivityWeightages(newWeightages);
    
    // Auto-save weightages to database
    if ([2, 3, 4].includes(selectedPointer as number) && studentIvyServiceId) {
      try {
        // Prepare weightages object for all selected activities
        const weightagesPayload: Record<string, number> = {};
        selectedActivities.forEach(actId => {
          weightagesPayload[actId] = newWeightages[actId] || 0;
        });

        await axios.put(`${IVY_API_URL}/pointer/activity/weightages`, {
          studentIvyServiceId,
          ivyExpertId,
          weightages: weightagesPayload,
        });
        
        // Clear any previous error message if save was successful
        if (message?.type === 'error' && message.text.includes('weightage')) {
          setMessage(null);
        }
      } catch (error: any) {
        // Silently handle weightage validation errors - they'll be shown in the UI warning box
        const errorMsg = error.response?.data?.message || '';
        if (!errorMsg.includes('weightage') && !errorMsg.includes('100')) {
          // Only show message for non-weightage errors
          console.error('Error saving weightages:', error);
          setMessage({ type: 'error', text: 'Failed to save weightages' });
        }
      }
    }
  };

  const getTotalWeightage = () => {
    // Only sum weightages for currently selected activities in current pointer admin activities
    const currentAdminIds = new Set(adminActivities.map(s => s._id));
    return Array.from(selectedActivities)
      .filter(id => currentAdminIds.has(id))
      .reduce((sum, id) => sum + (activityWeightages[id] || 0), 0);
  };

  const isWeightageValid = () => {
    if (![2, 3, 4].includes(selectedPointer as number)) return true;
    if (currentPointerSelectionCount === 0) return true;
    if (currentPointerSelectionCount === 1) return true;
    
    const total = getTotalWeightage();
    return Math.abs(total - 100) < 0.01;
  };

  const areDeadlinesValid = () => {
    // Check if all selected activities have deadlines
    const currentPointerAdminIds = new Set(adminActivities.map(s => s._id));
    const selectedIds = Array.from(selectedActivities).filter(id => currentPointerAdminIds.has(id));
    
    for (const id of selectedIds) {
      if (!activityDeadlines[id] || activityDeadlines[id].trim() === '') {
        return false;
      }
    }
    return true;
  };

  const handleSelectActivities = async () => {
    // Filter selected activities to only include those in the current admin activities (current pointer)
    const currentPointerAdminIds = new Set(adminActivities.map(s => s._id));
    const idsToSubmit = Array.from(selectedActivities).filter(id => currentPointerAdminIds.has(id));

    if (idsToSubmit.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one activity for this pointer' });
      return;
    }

    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }

    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Pointer must be selected' });
      return;
    }

    // Validate weightages for Pointers 2, 3, 4
    if ([2, 3, 4].includes(selectedPointer as number) && idsToSubmit.length > 1) {
      if (!isWeightageValid()) {
        setMessage({ type: 'error', text: `Total weightage must equal 100. Current total: ${getTotalWeightage().toFixed(2)}` });
        return;
      }
    }

    // Validate all selected activities have deadlines
    if (!areDeadlinesValid()) {
      setMessage({ type: 'error', text: 'All selected activities must have a deadline set' });
      return;
    }

    setSelectingActivities(true);
    setMessage(null);

    try {
      const payload: any = {
        studentIvyServiceId,
        ivyExpertId,
        agentSuggestionIds: idsToSubmit,
        pointerNo: selectedPointer,
      };

      // Add weightages for Pointers 2, 3, 4
      if ([2, 3, 4].includes(selectedPointer as number) && idsToSubmit.length > 0) {
        payload.weightages = idsToSubmit.map(id => activityWeightages[id] || 0);
      }

      // Add deadlines for each activity
      payload.deadlines = idsToSubmit.map(id => activityDeadlines[id] || '');

      const response = await axios.post(`${IVY_API_URL}/pointer/activity/select`, payload);

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Activities selected successfully!' });
        // Don't reset weightages - keep them for reference
        setTimeout(() => {
          fetchStudentActivities();
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to select activities';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSelectingActivities(false);
    }
  };

  const handleEvaluate = async (submissionId: string, score: string, feedback: string) => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setMessage({ type: 'error', text: 'Score must be between 0 and 10' });
      return;
    }

    try {
      const response = await axios.post(`${IVY_API_URL}/pointer/activity/evaluate`, {
        studentSubmissionId: submissionId,
        ivyExpertId,
        score: scoreNum,
        feedback,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Activity evaluated successfully!' });
        setTimeout(() => {
          fetchStudentActivities();
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to evaluate activity';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const getPointerLabel = (pointerNo: number): string => {
    switch (pointerNo) {
      case 2:
        return 'Pointer 2: Spike in One Area';
      case 3:
        return 'Pointer 3: Leadership & Initiative';
      case 4:
        return 'Pointer 4: Global & Social Impact';
      default:
        return `Pointer ${pointerNo}`;
    }
  };

  // Calculate activity completion percentage based on completed tasks
  const getActivityCompletionPercentage = (activity: StudentActivity): number => {
    if (!activity.ivyExpertDocuments || activity.ivyExpertDocuments.length === 0) {
      return 0;
    }
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    activity.ivyExpertDocuments.forEach(doc => {
      if (doc.tasks && doc.tasks.length > 0) {
        totalTasks += doc.tasks.length;
        completedTasks += doc.tasks.filter(task => task.status === 'completed').length;
      }
    });
    
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  if (!studentIvyServiceId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-md">
            Student Ivy Service ID is required. Please provide studentIvyServiceId as a query parameter.
          </div>
        </div>
      </div>
    );
  }

  // Calculate distinct selection count for the current pointer
  const currentPointerSelectionCount = adminActivities.filter(s => selectedActivities.has(s._id)).length;

  // Filter out activities already assigned to this student in any pointer (for dropdown)
  const alreadyAssignedIds = new Set(
    studentActivities
      .filter(a => a.suggestion?._id)
      .map(a => a.suggestion!._id)
  );
  const availableActivities = adminActivities.filter(a => !alreadyAssignedIds.has(a._id) || selectedActivities.has(a._id));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 max-md:h-auto max-md:flex-col max-md:overflow-visible">
      {/* Main Content - Tasks */}
      <div 
        className={`flex-1 overflow-y-auto transition-all duration-300 max-md:overflow-visible ${
          selectedTask ? 'w-[35%] max-md:hidden' : 'w-full'
        }`}
        style={{ maxWidth: selectedTask ? '35%' : '100%' }}
      >
        <div className={ivyPointerActivitiesOuterPadClass}>
          <div className={ivyPointerActivitiesShellClass}>
        {/* <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Management</h1> */}

        <div className="mb-8 border-gray-100 pb-6 max-md:mb-4 max-md:pb-3">
          <h2 className={ivyPointerActivitiesPageTitleClass}>
          {getPointerLabel(selectedPointer as number)}
          </h2>
        </div>

        {/* Tabs */}
        <div className={ivyPointerActivitiesTabsClass}>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`${ivyPointerActivitiesTabBtnClass} ${activeTab === 'suggestions'
              ? 'text-brand-600 border-b-2 border-brand-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Select Activities
          </button>
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`${ivyPointerActivitiesTabBtnClass} ${activeTab === 'evaluate'
              ? 'text-brand-600 border-b-2 border-brand-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Evaluate Proofs
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Select Activities Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            {/* Select Activities Button - navigates to full selection page */}
            <div className="mb-6">
              <button
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set('studentId', searchParams.get('studentId') || '');
                  params.set('studentIvyServiceId', studentIvyServiceId || '');
                  params.set('ivyExpertId', ivyExpertId);
                  params.set('pointerNo', String(selectedPointer));
                  router.push(`/ivy-league/ivy-expert/select-activities?${params.toString()}`);
                }}
                className={ivyPointerSelectActivitiesBtnClass}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Select Activities for {getPointerLabel(selectedPointer as number)}
              </button>
            </div>

            {/* Currently Assigned Activities Display */}
            {loadingActivities ? (
              <div className="text-center py-8 text-gray-500">Loading assigned activities...</div>
            ) : studentActivities.filter(a => a.pointerNo === selectedPointer).length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Assigned Activities ({studentActivities.filter(a => a.pointerNo === selectedPointer).length})
                </h2>
                <div className="space-y-3">
                  {studentActivities
                    .filter(a => a.pointerNo === selectedPointer)
                    .map((activity) => (
                    <div
                      key={activity.selectionId}
                      className={ivyPointerAssignedActivityCardClass}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className={`${ivyPointerActivityTitleClass} mb-1`}>
                            {activity.title}
                          </h3>
                          <p className="mb-3 whitespace-pre-wrap text-sm text-gray-700 max-md:break-words">
                            {activity.description}
                          </p>
                          {activity.tags && activity.tags.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {activity.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className={ivyPointerActivityMetaRowClass}>
                            {activity.weightage !== undefined && (
                              <span className="w-fit rounded bg-brand-100 px-2 py-0.5 font-semibold text-brand-700">
                                Weightage: {activity.weightage}%
                              </span>
                            )}
                            {activity.deadline && (
                              <span className={ivyPointerActivityDeadlineTextClass}>
                                ⏰ Deadline: {new Date(activity.deadline).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No activities assigned yet. Click the button above to select activities.
              </div>
            )}
          </div>
        )}

        {/* Evaluate Proofs Tab */}
        {activeTab === 'evaluate' && (
          <div className="space-y-6">
            {/* <div className="mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                <span className={`w-3 h-10 rounded-full ${selectedPointer === 2 ? 'bg-brand-500' : selectedPointer === 3 ? 'bg-brand-500' : 'bg-brand-500'}`}></span>
                {getPointerLabel(selectedPointer as number)} - EVALUATION
              </h2>
            </div> */}

            <div className={ivyPointerRefreshRowClass}>
              <button
                onClick={fetchStudentActivities}
                disabled={loadingActivities}
                className={ivyPointerRefreshBtnClass}
              >
                {loadingActivities ? 'Refreshing...' : 'Refresh Activities'}
              </button>
            </div>

            {loadingActivities ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading activities...</div>
              </div>
            ) : studentActivities.filter(a => a.pointerNo === selectedPointer).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No activities assigned for {getPointerLabel(selectedPointer as number)} yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {studentActivities
                  .filter(activity => activity.pointerNo === selectedPointer)
                  .map((activity) => {
                    const isActivityOverdue = activity.deadline && !activity.proofUploaded && getCountdown(activity.deadline).expired;
                    return (
                    <div
                      key={activity.selectionId}
                      className={ivyPointerActivityCardClass}
                    >
                      {/* Overdue Ribbon — desktop corner ribbon; mobile inline badge */}
                      {isActivityOverdue && (
                        <>
                          <span className={ivyPointerOverdueBadgeClass}>Overdue</span>
                          <div className={ivyPointerOverdueRibbonClass}>
                            <div className="absolute left-[-32px] top-[14px] w-[140px] rotate-[-45deg] transform bg-red-600 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                              Overdue
                            </div>
                          </div>
                        </>
                      )}
                      <div className="mb-4">
                        <div className={ivyPointerActivityEvaluateTitleRowClass}>
                          <h3 className={ivyPointerActivityTitleClass}>{activity.title}</h3>
                          {[2, 3, 4].includes(activity.pointerNo) && (
                            <div className={ivyPointerActivityProgressTrackClass}>
                              <div className={ivyPointerActivityProgressBarClass}>
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    getActivityCompletionPercentage(activity) === 100 
                                      ? 'bg-green-500' 
                                      : getActivityCompletionPercentage(activity) >= 50 
                                        ? 'bg-brand-500' 
                                        : 'bg-orange-500'
                                  }`}
                                  style={{ width: `${getActivityCompletionPercentage(activity)}%` }}
                                ></div>
                              </div>
                              <span className={`shrink-0 text-sm font-bold ${
                                getActivityCompletionPercentage(activity) === 100 
                                  ? 'text-green-600' 
                                  : getActivityCompletionPercentage(activity) >= 50 
                                    ? 'text-brand-600' 
                                    : 'text-orange-600'
                              }`}>
                                {getActivityCompletionPercentage(activity)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mb-2 text-sm text-gray-500 max-md:text-xs">
                          {getPointerLabel(activity.pointerNo)}
                          {[2, 3, 4].includes(activity.pointerNo) && activity.weightage !== undefined && (
                            <span className="ml-0 block font-semibold text-brand-600 sm:ml-3 sm:inline">
                              • Weightage: {activity.weightage}%
                            </span>
                          )}
                        </p>
                        <p className="mb-4 whitespace-pre-wrap text-gray-700 max-md:break-words max-md:text-sm">
                          {activity.description}
                        </p>
                      </div>

                      {/* Deadline Section */}
                      {!activity.proofUploaded && activity.deadline && (() => {
                        const cd = getCountdown(activity.deadline);
                        return (
                          <div className={ivyPointerDeadlinePanelClass}>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-bold text-brand-900 max-md:text-xs">⏰ Activity Deadline</p>
                            </div>
                            {cd.expired ? (
                              <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2">
                                <span className="text-sm font-bold text-red-700">⚠ Deadline Expired</span>
                              </div>
                            ) : (
                              <div className={ivyPointerCountdownBlockClass}>
                                <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">Time Left:</span>
                                <div className={ivyPointerCountdownRowClass}>
                                {[
                                  { value: cd.days, unit: 'Days' },
                                  { value: cd.hours, unit: 'Hrs' },
                                  { value: cd.minutes, unit: 'Min' },
                                  { value: cd.seconds, unit: 'Sec' },
                                ].map((item) => (
                                  <div key={item.unit} className={ivyPointerCountdownUnitClass}>
                                    <span className={ivyPointerCountdownValueClass}>{String(item.value).padStart(2, '0')}</span>
                                    <span className="text-[10px] font-bold uppercase text-brand-500">{item.unit}</span>
                                  </div>
                                ))}
                                </div>
                              </div>
                            )}
                            {/* Update deadline */}
                            <div className={ivyPointerDeadlineUpdateRowClass}>
                              <input
                                type="datetime-local"
                                value={deadlineInputs[activity.selectionId] || new Date(activity.deadline).toISOString().slice(0, 16)}
                                onChange={(e) => setDeadlineInputs(prev => ({ ...prev, [activity.selectionId]: e.target.value }))}
                                className={ivyPointerDeadlineInputClass}
                              />
                              <button
                                onClick={() => handleSetDeadline(activity.selectionId)}
                                disabled={savingDeadline === activity.selectionId || !deadlineInputs[activity.selectionId]}
                                className={ivyPointerDeadlineUpdateBtnClass}
                              >
                                {savingDeadline === activity.selectionId ? 'Saving...' : 'Update Deadline'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Ivy Expert Documents Section */}
                      <div className="mb-4 rounded-md border border-brand-200 bg-brand-50 p-4 max-md:p-3">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-brand-900 max-md:text-xs">Activity guides for Student</p>
                        </div>
                        {activity.ivyExpertDocuments && activity.ivyExpertDocuments.length > 0 ? (
                          <div className="space-y-3">
                            {activity.ivyExpertDocuments.map((doc, docIdx) => (
                              <div key={docIdx} className="bg-white rounded-lg border border-brand-200 overflow-hidden">
                                {/* Document Header */}
                                <div className="flex flex-col gap-2 border-b border-brand-100 bg-brand-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="min-w-0 break-words text-sm font-semibold text-gray-800">📎 Guide {docIdx + 1}</span>
                                  <button
                                    onClick={() => setViewingIvyExpertDocUrl(viewingIvyExpertDocUrl === doc.url ? null : doc.url)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-md ${viewingIvyExpertDocUrl === doc.url ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700 hover:bg-brand-200'}`}
                                  >
                                    {viewingIvyExpertDocUrl === doc.url ? 'Hide' : 'View'}
                                  </button>
                                </div>

                                {/* Tasks List with Status Dropdown */}
                                <div className="p-3">
                                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tasks</p>
                                  <div className="space-y-1.5">
                                    {[...doc.tasks].sort((a, b) => {
                                      // Sort: not-started and in-progress first, completed last
                                      if (a.status === 'completed' && b.status !== 'completed') return 1;
                                      if (a.status !== 'completed' && b.status === 'completed') return -1;
                                      return 0;
                                    }).map((task, taskIdx) => {
                                      // Find original index for API call
                                      const originalIndex = doc.tasks.findIndex(t => t.title === task.title && t.page === task.page);
                                      
                                      return (
                                        <div
                                          key={taskIdx}
                                          className={ivyPointerActivityTaskRowClass}
                                          onClick={() => handleTaskClick(activity.title, task, activity.selectionId)}
                                        >
                                          {task.status === 'completed' && (
                                            <div className="flex-shrink-0 mt-0.5">
                                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                                {task.title}
                                              </p>
                                            </div>
                                            {task.page && (
                                              <p className="text-xs text-gray-500">Page {task.page}</p>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTaskClick(activity.title, task, activity.selectionId);
                                            }}
                                            className={ivyPointerActivityTaskChatBtnClass}
                                          >
                                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                            Chat
                                          </button>
                                          <select
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={async (e) => {
                                              e.stopPropagation();
                                              const newStatus = e.target.value as 'not-started' | 'in-progress' | 'completed';
                                              try {
                                                const response = await axios.post(`${IVY_API_URL}/pointer/activity/ivy-expert/task/status`, {
                                                  selectionId: activity.selectionId,
                                                  ivyExpertId,
                                                  documentUrl: doc.url,
                                                  taskIndex: originalIndex,
                                                  status: newStatus
                                                });
                                                
                                                if (response.data.success) {
                                                  // Update local state
                                                  setStudentActivities(prev => prev.map(act => {
                                                    if (act.selectionId === activity.selectionId) {
                                                      const updatedDocs = act.ivyExpertDocuments?.map((d, idx) => {
                                                        if (idx === docIdx) {
                                                          const updatedTasks = d.tasks.map((t, tIdx) => 
                                                            tIdx === originalIndex ? { ...t, status: newStatus } : t
                                                          );
                                                          return { ...d, tasks: updatedTasks };
                                                        }
                                                        return d;
                                                      });
                                                      return { ...act, ivyExpertDocuments: updatedDocs };
                                                    }
                                                    return act;
                                                  }));
                                                  setMessage({ type: 'success', text: 'Task status updated' });
                                                  setTimeout(() => setMessage(null), 2000);
                                                }
                                              } catch (error: any) {
                                                setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update task' });
                                              }
                                            }}
                                            className={`${ivyPointerActivityTaskSelectClass} cursor-pointer rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                              task.status === 'completed' 
                                                ? 'bg-green-100 text-green-800 border-green-300' 
                                                : task.status === 'in-progress'
                                                ? 'bg-brand-100 text-brand-800 border-brand-300'
                                                : 'bg-gray-100 text-gray-600 border-gray-300'
                                            }`}
                                          >
                                            <option value="not-started">Not Started</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium text-brand-700">
                                        {doc.tasks.filter(t => t.status === 'completed').length} of {doc.tasks.length}
                                      </span> tasks completed
                                    </p>
                                  </div>
                                </div>

                                {/* Document Viewer */}
                                {viewingIvyExpertDocUrl === doc.url && (
                                  <div className="border-t border-brand-100">
                                    <InlineDocViewer url={doc.url} onClose={() => setViewingIvyExpertDocUrl(null)} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-brand-700">No activity guides uploaded yet. Upload Word guides for students to view.</p>
                        )}
                      </div>

                      {activity.proofUploaded ? (
                        <div className="mb-4 p-4 bg-brand-50 border border-brand-200 rounded-md">
                          <p className="text-sm font-medium text-brand-900 mb-2">Proof Submitted</p>
                          <p className="text-xs text-brand-700 mb-3">
                            Submitted: {new Date(activity.submission!.submittedAt).toLocaleString('en-GB')}
                          </p>
                          <div className="space-y-4">
                            {activity.submission!.files.map((fileUrl, index) => (
                              <div key={fileUrl} className="flex flex-col gap-2">
                                <button
                                  onClick={() => setViewingFileUrl(viewingFileUrl === fileUrl ? null : fileUrl)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all w-fit ${viewingFileUrl === fileUrl ? 'bg-brand-600 text-white shadow-lg' : 'bg-white text-brand-600 border border-brand-100 hover:bg-brand-50'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {viewingFileUrl === fileUrl ? 'Hide Proof' : `View Proof ${index + 1}`}
                                </button>
                                {viewingFileUrl === fileUrl && (
                                  <InlineDocViewer url={fileUrl} onClose={() => setViewingFileUrl(null)} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">Waiting for student to upload proof...</p>
                        </div>
                      )}

                      {activity.evaluated ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm font-medium text-green-900 mb-1">
                            Score: {activity.evaluation!.score}/10
                          </p>
                          {activity.evaluation!.feedback && (
                            <p className="text-sm text-green-800 whitespace-pre-wrap">
                              {activity.evaluation!.feedback}
                            </p>
                          )}
                          <p className="text-xs text-green-700 mt-2">
                            Evaluated: {new Date(activity.evaluation!.evaluatedAt).toLocaleString('en-GB')}
                          </p>
                        </div>
                      ) : activity.proofUploaded ? (
                        <ActivityEvaluationForm
                          submissionId={activity.submission!._id}
                          onEvaluate={handleEvaluate}
                        />
                      ) : null}
                    </div>
                  );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      </div>
    

      {/* Conversation Window */}
      {selectedTask && (
        <>
          {!isMobileViewport && (
            <div className="h-full w-[65%] shrink-0 overflow-hidden border-l border-gray-200">
              <ConversationWindow
                activityTitle={selectedTask.activityTitle}
                task={selectedTask.task}
                activityId={selectedTask.activityId}
                studentIvyServiceId={studentIvyServiceId!}
                onClose={handleCloseConversation}
                ivyExpertId={ivyExpertId}
              />
            </div>
          )}
          {isMobileViewport &&
            portalMounted &&
            createPortal(
              <div className={ivyPointerConversationOverlayClass}>
                <ConversationWindow
                  activityTitle={selectedTask.activityTitle}
                  task={selectedTask.task}
                  activityId={selectedTask.activityId}
                  studentIvyServiceId={studentIvyServiceId!}
                  onClose={handleCloseConversation}
                  ivyExpertId={ivyExpertId}
                />
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}

function ActivityEvaluationForm({
  submissionId,
  onEvaluate,
}: {
  submissionId: string;
  onEvaluate: (submissionId: string, score: string, feedback: string) => void;
}) {
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Evaluate Activity</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-10)</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (Optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 bg-white"
          />
        </div>
        <button
          onClick={() => onEvaluate(submissionId, score, feedback)}
          className="w-full bg-brand-600 text-white py-2 px-4 rounded-md hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Submit Evaluation
        </button>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
