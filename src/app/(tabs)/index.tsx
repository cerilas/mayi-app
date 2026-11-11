import Toast from 'react-native-toast-message';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image, Linking,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, Pressable, ScrollView, Alert, Modal, DeviceEventEmitter
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as WebBrowser from 'expo-web-browser';
import {
  Check, ChevronRight, Download, Folder, FolderOpen, FolderPlus,
  ImageIcon, FileUp,
  Inbox, LogIn, LogOut, Menu, MessageCircle, MoreHorizontal, Pencil, Plus,
  Send, Settings, Sparkles, Trash2, WandSparkles, X, Share2, Bot, Brain, Activity, AlertCircle, Info
} from 'lucide-react-native';
import axios from 'axios';
import Animated, { FadeInDown, withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { AppHeader } from '../../components/app-header';
import { BrandLogo } from '../../components/brand-logo';
import { TypingIndicator } from '../../components/typing-indicator';
import { MarkdownMessage } from '../../components/markdown-message';
import {
  MessageAttachments,
  PendingAttachments,
  attachmentFileUrl,
  type ChatAttachment,
  type ChatImagePreview,
} from '../../components/message-attachments';
import {
  fileNameFromUrl,
  inferMimeType,
  isDownloadableUrl,
  saveOrShareFile,
} from '../../lib/mobile-files';
import { useTheme } from '../../context/ThemeContext';
import { ClinicQuickActions, ClinicQuickChips } from '../../components/clinic-quick-actions';
import { AppointmentPicker } from '../../components/appointment-picker';
import { hasAppointmentPicker, stripAppointmentPicker, type QuickActionKey } from '../../constants/clinic';

const API_URL = 'https://my.cerilas.com/api';
const API_ORIGIN = API_URL.replace(/\/api$/, '');
// Share link uses the network IP so it opens in real browsers/devices
const SHARE_ORIGIN = 'https://my.cerilas.com';
const MAX_GUEST_QUESTIONS = 5;
const GUEST_QUOTA_KEY = 'guest_questions_used_v1';
const CLINIC_WHATSAPP_PHONE = '905406502727';

interface PickedUploadAsset {
  file?: Blob;
  mimeType: string;
  name: string;
  size?: number;
  uri: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
}
interface AIModel {
  id: string;
  label: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  aiProvider?: string;
  folderId: string | null;
}
interface FolderItem {
  id: string;
  name: string;
  _count?: { conversations: number };
}

export default function ChatScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const isGuest = !token;
  const { assistantIcon } = useSettingsStore();
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const [guestUsedCount, setGuestUsedCount] = useState(0);
  const guestLimitReached = isGuest && guestUsedCount >= MAX_GUEST_QUESTIONS;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-pro');
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<ChatImagePreview | null>(null);
  const [resourceBusy, setResourceBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState('');
  const [conversationMenu, setConversationMenu] = useState<Conversation | null>(null);
  const [conversationTitleDraft, setConversationTitleDraft] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareActive, setShareActive] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState<QuickActionKey | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const pickerLock = useRef(false);
  const sidebarAnim = useSharedValue(0);

  const authorization = `Bearer ${token}`;
  const headers = { Authorization: authorization };

  const openSidebar = () => {
    setSidebarOpen(true);
    sidebarAnim.value = withTiming(1, { duration: 220 });
  };
  const closeSidebar = () => {
    sidebarAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => setSidebarOpen(false), 200);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -280 + sidebarAnim.value * 280 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: sidebarAnim.value * 0.45,
  }));

  const loadGuestQuota = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const val = localStorage.getItem(GUEST_QUOTA_KEY);
        setGuestUsedCount(val ? Math.max(0, parseInt(val, 10) || 0) : 0);
        return;
      }
      const val = await SecureStore.getItemAsync(GUEST_QUOTA_KEY);
      setGuestUsedCount(val ? Math.max(0, parseInt(val, 10) || 0) : 0);
    } catch {
      setGuestUsedCount(0);
    }
  }, []);

  const saveGuestQuota = useCallback(async (count: number) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(GUEST_QUOTA_KEY, String(count));
        return;
      }
      await SecureStore.setItemAsync(GUEST_QUOTA_KEY, String(count));
    } catch {}
  }, []);

  const openClinicWhatsApp = useCallback(async () => {
    const text = encodeURIComponent(
      'Merhaba, MY FizioAI uygulamasındaki misafir soru hakkımı tamamladım. Kliniğinizden danışan kaydı ve ek kullanım hakkı hakkında bilgi almak istiyorum.'
    );
    const whatsappUrl = `whatsapp://send?phone=${CLINIC_WHATSAPP_PHONE}&text=${text}`;
    const webUrl = `https://wa.me/${CLINIC_WHATSAPP_PHONE}?text=${text}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    if (!token || user?.role === 'patient') return;
    try {
      const res = await axios.get(`${API_URL}/models`, { headers });
      if (res.data?.gemini) {
        setAiModels(res.data.gemini);
      }
    } catch (e) {
      console.warn('Modeller alınamadı', e);
    }
  }, [token, user?.role]);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/conversations?limit=30`, { headers });
      const items: Conversation[] = res.data?.items ?? res.data ?? [];
      setConversations(items);
      return items;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        await logout();
        return [];
      }

      console.warn('Konuşmalar alınamadı', e);
      return [];
    }
  }, [token, logout]);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/folders`, { headers });
      setFolders(res.data ?? []);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        await logout();
        return;
      }

      console.warn('Klasörler alınamadı', e);
    }
  }, [token, logout]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await axios.get(`${API_URL}/conversations/${convId}`, { headers });
      const msgs: Message[] = res.data?.messages ?? [];
      setMessages(msgs);
    } catch (e) {
      console.error('fetchMessages error', e);
    }
  }, [token]);

  const createNewConversation = useCallback(async () => {
    try {
      const res = await axios.post(`${API_URL}/conversations`, {}, { headers });
      const newConv: Conversation = res.data;
      setConversations(prev => [newConv, ...prev]);
      setConversationId(newConv.id);
      setMessages([]);
      DeviceEventEmitter.emit('showMedicalDisclaimer');
      closeSidebar();
      return newConv.id;
    } catch (e) {
      console.error('createNewConversation error', e);
      return null;
    }
  }, [token]);

  const runQuickAction = useCallback(async (action: QuickActionKey) => {
    if (quickBusy || sending) return;
    setQuickBusy(action);
    try {
      let convId = conversationId;
      if (!convId) {
        const res = await axios.post(`${API_URL}/conversations`, {}, { headers });
        const newConv: Conversation = res.data;
        setConversations(prev => [newConv, ...prev]);
        setConversationId(newConv.id);
        convId = newConv.id;
      }
      const res = await axios.post(`${API_URL}/conversations/${convId}/quick`, { action }, { headers });
      const newMessages: Message[] = res.data?.messages ?? [];
      setMessages(prev => [...prev, ...newMessages]);
      void fetchConversations();
    } catch (e) {
      console.error('quick action error', e);
      Toast.show({ type: 'error', text1: 'İşlem tamamlanamadı', text2: 'Lütfen bağlantınızı kontrol edip tekrar deneyin.' });
    } finally {
      setQuickBusy(null);
    }
  }, [quickBusy, sending, conversationId, token, fetchConversations]);

  const selectConversation = useCallback(async (conv: Conversation) => {
    setConversationId(conv.id);
    closeSidebar();
    setMessages([]);
    DeviceEventEmitter.emit('showMedicalDisclaimer');
    await fetchMessages(conv.id);
  }, [fetchMessages]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (!token) {
        await loadGuestQuota();
        setConversations([]);
        setFolders([]);
        setConversationId(null);
        setMessages([]);
        setLoading(false);
        return;
      }
      const [items] = await Promise.all([
        fetchConversations(),
        fetchFolders(),
      ]);
      if (items.length > 0) {
        setConversationId(items[0].id);
        DeviceEventEmitter.emit('showMedicalDisclaimer');
        await fetchMessages(items[0].id);
      } else {
        setConversationId(null);
        setMessages([]);
      }
      setLoading(false);
    };
    void init();
  }, [token, loadGuestQuota]);

  const toggleFolder = (folderId: string) => {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    try {
      const res = await axios.post(`${API_URL}/folders`, { name }, { headers });
      const folder: FolderItem = { ...res.data, _count: { conversations: 0 } };
      setFolders((current) => [...current, folder]);
      setOpenFolders((current) => new Set(current).add(folder.id));
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (e) {
      console.warn('Klasör oluşturulamadı', e);
    }
  };

  const renameFolder = async (folderId: string) => {
    const name = folderNameDraft.trim();
    if (!name) return;

    try {
      await axios.patch(`${API_URL}/folders/${folderId}`, { name }, { headers });
      setFolders((current) => current.map((folder) => (
        folder.id === folderId ? { ...folder, name } : folder
      )));
      setRenamingFolderId(null);
      setFolderNameDraft('');
    } catch (e) {
      console.warn('Klasör yeniden adlandırılamadı', e);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await axios.delete(`${API_URL}/folders/${folderId}`, { headers });
      setFolders((current) => current.filter((folder) => folder.id !== folderId));
      setConversations((current) => current.map((conversation) => (
        conversation.folderId === folderId ? { ...conversation, folderId: null } : conversation
      )));
    } catch (e) {
      console.warn('Klasör silinemedi', e);
    }
  };

  const confirmDeleteFolder = (folder: FolderItem) => {
    Alert.alert(
      'Klasörü Sil',
      `“${folder.name}” klasörü silinecek. İçindeki sohbetler klasörsüz alana taşınacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => void deleteFolder(folder.id) },
      ],
    );
  };

  const moveConversation = async (conversation: Conversation, folderId: string | null) => {
    try {
      await axios.patch(`${API_URL}/conversations/${conversation.id}`, { folderId }, { headers });
      setConversations((current) => current.map((item) => (
        item.id === conversation.id ? { ...item, folderId } : item
      )));
      if (folderId) {
        setOpenFolders((current) => new Set(current).add(folderId));
      }
      setConversationMenu(null);
    } catch (e) {
      console.warn('Sohbet taşınamadı', e);
    }
  };

  const renameConversation = async () => {
    if (!conversationMenu) return;
    const title = conversationTitleDraft.trim();
    if (!title || title === conversationMenu.title) return;

    try {
      await axios.patch(`${API_URL}/conversations/${conversationMenu.id}`, { title }, { headers });
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationMenu.id ? { ...conversation, title } : conversation
      )));
      setConversationMenu((current) => current ? { ...current, title } : null);
    } catch (e) {
      console.warn('Sohbet yeniden adlandırılamadı', e);
    }
  };

  const deleteConversation = async (conversation: Conversation) => {
    try {
      await axios.delete(`${API_URL}/conversations/${conversation.id}`, { headers });
      setConversations((current) => current.filter((item) => item.id !== conversation.id));
      if (conversationId === conversation.id) {
        setConversationId(null);
        setMessages([]);
      }
      setConversationMenu(null);
    } catch (e) {
      console.warn('Sohbet silinemedi', e);
    }
  };

  const confirmDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbet kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => void deleteConversation(conversation) },
      ],
    );
  };

  const uploadPickedAssets = async (pickedAssets: PickedUploadAsset[]) => {
    if (pickedAssets.length === 0 || uploading) return;

    const normalizedAssets = pickedAssets.map(asset => ({
      ...asset,
      mimeType: asset.mimeType === 'image/jpg' ? 'image/jpeg' : asset.mimeType,
    }));
    const allowedTypes = new Set([
      'application/pdf',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    const unsupported = normalizedAssets.find(asset => !allowedTypes.has(asset.mimeType));
    if (unsupported) {
      setUploadError('Bu dosya türü desteklenmiyor. JPG, PNG, GIF, WebP, HEIC veya PDF seçin.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const uploadedAssets: ChatAttachment[] = [];

      for (const asset of normalizedAssets) {
        if (Platform.OS === 'web' && asset.file) {
          const formData = new FormData();
          formData.append('files', asset.file, asset.name);
          
          const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { Authorization: authorization },
            body: formData,
          });
          const data = await response.json().catch(() => ({}));

          if (response.status === 401) {
            await logout();
            return;
          }
          if (!response.ok) {
            throw new Error(data.error || 'Yükleme başarısız');
          }
          uploadedAssets.push(...(data.attachments ?? []));
        } else {
          // Native upload
          const uploadResult = await FileSystem.uploadAsync(`${API_URL}/upload`, asset.uri, {
            fieldName: 'files',
            httpMethod: 'POST',
            uploadType: 1 as any,
            headers: { Authorization: authorization },
            mimeType: asset.mimeType,
          });
          
          const data = JSON.parse(uploadResult.body);
          if (uploadResult.status === 401) {
            await logout();
            return;
          }
          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(data.error || 'Yükleme başarısız');
          }
          uploadedAssets.push(...(data.attachments ?? []));
        }
      }

      const uploaded: ChatAttachment[] = uploadedAssets.map(
        (attachment: ChatAttachment, index: number) => ({
          ...attachment,
          localUri: normalizedAssets[index]?.uri,
        }),
      );
      setPendingAttachments(current => [...current, ...uploaded]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const pickImages = async () => {
    if (pickerLock.current) return;
    pickerLock.current = true;
    setToolsOpen(false);

    // Wait for UI to settle before presenting native picker
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Toast.show({ type: 'error', text1: 'İzin Gerekli', text2: 'Görsel seçebilmek için fotoğraf erişimine izin vermelisiniz.' });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        quality: 0.8, // 1 yerine 0.8 kullanarak iOS'ta HEIC'in otomatik olarak JPEG'e dönüştürülmesini sağlarız
      });
      if (result.canceled) return;

      const picked = result.assets.map((asset, index): PickedUploadAsset => {
        const mimeType = asset.mimeType ?? inferMimeType(asset.fileName ?? '', 'image/jpeg');
        const extension = mimeType === 'image/png' ? 'png'
          : mimeType === 'image/gif' ? 'gif'
            : mimeType === 'image/webp' ? 'webp'
              : mimeType === 'image/heic' ? 'heic'
                : mimeType === 'image/heif' ? 'heif'
                  : 'jpg';
        return {
          file: asset.file,
          mimeType,
          name: asset.fileName ?? `gorsel-${Date.now()}-${index + 1}.${extension}`,
          size: asset.fileSize,
          uri: asset.uri,
        };
      });
      await uploadPickedAssets(picked);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Görseller seçilemedi');
    } finally {
      pickerLock.current = false;
    }
  };

  const pickDocuments = async () => {
    if (pickerLock.current) return;
    pickerLock.current = true;
    setToolsOpen(false);

    // Wait for UI to settle before presenting native picker
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: 'application/pdf',
      });
      if (result.canceled) return;

      await uploadPickedAssets(result.assets.map(asset => ({
        file: asset.file,
        mimeType: asset.mimeType ?? inferMimeType(asset.name),
        name: asset.name,
        size: asset.size,
        uri: asset.uri,
      })));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya seçilemedi');
    } finally {
      pickerLock.current = false;
    }
  };

  const shareResource = async (
    url: string,
    fileName: string,
    mimeType: string,
    resourceAuthorization?: string,
  ) => {
    if (resourceBusy) return;
    setResourceBusy(true);
    try {
      await saveOrShareFile({
        url,
        fileName,
        mimeType,
        authorization: resourceAuthorization,
      });
    } catch (error) {
      Alert.alert(
        'Dosya Açılamadı',
        error instanceof Error ? error.message : 'Dosya indirilemedi.',
      );
    } finally {
      setResourceBusy(false);
    }
  };

  const openAttachmentFile = (attachment: ChatAttachment) => {
    void shareResource(
      attachmentFileUrl(API_URL, attachment.filePath),
      attachment.fileName,
      attachment.mimeType,
      authorization,
    );
  };

  const openMarkdownLink = (url: string) => {
    if (!isDownloadableUrl(url)) {
      void Linking.openURL(url);
      return;
    }

    const dataMimeType = url.match(/^data:([^;,]+)/)?.[1];
    const fileName = fileNameFromUrl(url, 'yapay-zeka-dosyasi');
    const mimeType = dataMimeType ?? inferMimeType(fileName);
    const needsAuthorization = url.startsWith(API_ORIGIN) && url.includes('/api/files/');
    void shareResource(
      url,
      fileName,
      mimeType,
      needsAuthorization ? authorization : undefined,
    );
  };

  const generateImage = async (prompt: string) => {
    if (!prompt || sending) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await createNewConversation();
      if (!currentConvId) return;
    }

    const userId = `temp-image-${Date.now()}`;
    const assistantId = `image-placeholder-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages(current => [
      ...current,
      {
        id: userId,
        role: 'user',
        content: `🎨 Görsel üret: ${prompt}`,
        createdAt: now,
        attachments: [],
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: now,
        attachments: [],
      },
    ]);
    setInput('');
    setImageMode(false);
    setSending(true);

    try {
      const response = await fetch(`${API_URL}/generate-image`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, conversationId: currentConvId }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        await logout();
        return;
      }
      if (!response.ok || data.error) {
        throw new Error(data.message || data.error || 'Görsel oluşturulamadı');
      }

      setMessages(current => current.map(message => {
        if (message.id === userId) {
          return { ...message, id: data.userMsgId ?? message.id };
        }
        if (message.id === assistantId) {
          return {
            ...message,
            id: data.assistantMsgId ?? message.id,
            content: data.assistantContent || 'Görsel oluşturuldu.',
          };
        }
        return message;
      }));
      void fetchConversations();
    } catch (error) {
      setMessages(current => current.map(message => (
        message.id === assistantId
          ? {
            ...message,
            content: error instanceof Error ? error.message : 'Görsel oluşturulamadı.',
          }
          : message
      )));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (sending || uploading) return;

    if (isGuest) {
      if (!trimmedInput || guestUsedCount >= MAX_GUEST_QUESTIONS) return;

      const userInput = trimmedInput;
      const nextUsed = guestUsedCount + 1;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userInput,
        createdAt: new Date().toISOString(),
        attachments: [],
      };
      const placeholderId = 'placeholder-' + Date.now();
      const placeholderMsg: Message = {
        id: placeholderId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        attachments: [],
      };

      const historyPayload = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userInput },
      ];

      setMessages(prev => [...prev, userMsg, placeholderMsg]);
      setInput('');
      setSending(true);
      setGuestUsedCount(nextUsed);
      void saveGuestQuota(nextUsed);

      try {
        // XMLHttpRequest works reliably on iOS/Android/web and lets us read the
        // streamed text progressively without ReadableStream/TextDecoder.
        const decodeB64Utf8 = (b64: string) => {
          try {
            const binary = atob(b64);
            let encoded = '';
            for (let i = 0; i < binary.length; i++) {
              encoded += '%' + ('00' + binary.charCodeAt(i).toString(16)).slice(-2);
            }
            return decodeURIComponent(encoded);
          } catch {
            return 'Yapay zekâ yanıt oluşturamadı';
          }
        };
        const cleanText = (raw: string) => raw
          .replace(/__KEEPALIVE__/g, '')
          .replace(/\n\n__(?:TITLE|ERROR)_B64__[A-Za-z0-9+/=]*/g, '');

        const result = await new Promise<{ status: number; text: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/mobile/guest-chat`);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.timeout = 120_000;
          xhr.onprogress = () => {
            if (xhr.status && xhr.status !== 200) return;
            const partial = cleanText(xhr.responseText || '');
            if (partial) {
              setMessages(prev => prev.map(m => (
                m.id === placeholderId ? { ...m, content: partial } : m
              )));
            }
          };
          xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText || '' });
          xhr.onerror = () => reject(new Error('Ağ bağlantısı kurulamadı'));
          xhr.ontimeout = () => reject(new Error('Yanıt zaman aşımına uğradı'));
          xhr.send(JSON.stringify({ messages: historyPayload, questionCount: nextUsed }));
        });

        if (result.status !== 200) {
          let data: { error?: string; message?: string } = {};
          try { data = JSON.parse(result.text); } catch {}
          if (data.error === 'guest_limit_exceeded') {
            setGuestUsedCount(MAX_GUEST_QUESTIONS);
            void saveGuestQuota(MAX_GUEST_QUESTIONS);
            setMessages(prev => prev.map(m => m.id === placeholderId ? {
              ...m,
              content: data.message || 'Misafir olarak tanımlanan 5 soru-cevap hakkınız dolmuştur. Uygulamamız MyFizyoterapi kliniği danışanlarına özeldir. Daha fazla soru hakkı ve kişisel takip için lütfen önce kliniğimize başvurunuz.',
            } : m));
            return;
          }
          throw new Error(data.message || data.error || `Sunucu hatası (${result.status})`);
        }

        const errorMatch = result.text.match(/\n\n__ERROR_B64__([A-Za-z0-9+/=]+)/);
        if (errorMatch) {
          throw new Error(decodeB64Utf8(errorMatch[1]));
        }

        const finalText = cleanText(result.text).trim();
        if (!finalText) throw new Error('Boş yanıt alındı');
        setMessages(prev => prev.map(m => (
          m.id === placeholderId ? { ...m, content: finalText } : m
        )));
      } catch (error) {
        console.error('guest sendMessage error', error);
        setGuestUsedCount(guestUsedCount);
        void saveGuestQuota(guestUsedCount);
        const reason = error instanceof Error && error.message ? `\n\n_(${error.message.slice(0, 160)})_` : '';
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: `Yanıt alınamadı. Lütfen tekrar deneyin.${reason}` } : m));
      } finally {
        setSending(false);
      }
      return;
    }

    if (imageMode) {
      await generateImage(trimmedInput);
      return;
    }
    if (!trimmedInput && pendingAttachments.length === 0) return;

    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await createNewConversation();
      if (!currentConvId) return;
    }

    const userInput = trimmedInput;
    const attachmentsToSend = [...pendingAttachments];
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      createdAt: new Date().toISOString(),
      attachments: attachmentsToSend,
    };
    const placeholderId = 'placeholder-' + Date.now();
    const placeholderMsg: Message = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      attachments: [],
    };

    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setInput('');
    setPendingAttachments([]);
    setUploadError('');
    setSending(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90s max

      const response = await fetch(`${API_URL}/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: userInput,
          attachmentIds: attachmentsToSend.map(attachment => attachment.id),
          model: user?.role !== 'patient' ? selectedModel : undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error === 'usage_limit_exceeded' && data.message) {
          setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: data.message } : m));
          return;
        }
        throw new Error(data.message || data.error || `Sunucu hatası (${response.status})`);
      }
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          const titleMatch = accumulated.match(/\n\n__TITLE_B64__([A-Za-z0-9+/=]+)/);
          if (titleMatch) {
            try {
              const binary = atob(titleMatch[1]);
              const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
              const title = new TextDecoder('utf-8').decode(bytes);
              setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, title } : c));
            } catch {}
          }

          const errorMatch = accumulated.match(/\n\n__ERROR_B64__([A-Za-z0-9+/=]+)/);
          if (errorMatch) {
            try {
              const binary = atob(errorMatch[1]);
              const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
              throw new Error(new TextDecoder('utf-8').decode(bytes));
            } catch (error) {
              if (error instanceof Error) throw error;
              throw new Error('Yapay zekâ yanıt oluşturamadı');
            }
          }

          const displayText = accumulated
            .replace(/__KEEPALIVE__/g, '')
            .replace(/\n\n__(?:TITLE|ERROR)_B64__[A-Za-z0-9+/=]*/g, '');
          setMessages(prev => prev.map(m => (
            m.id === placeholderId ? { ...m, content: displayText } : m
          )));
        }
      } else {
        const accumulated = await response.text();
        const titleMatch = accumulated.match(/\n\n__TITLE_B64__([A-Za-z0-9+/=]+)/);
        if (titleMatch) {
          try {
            const binary = atob(titleMatch[1]);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            const title = new TextDecoder('utf-8').decode(bytes);
            setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, title } : c));
          } catch {}
        }

        const errorMatch = accumulated.match(/\n\n__ERROR_B64__([A-Za-z0-9+/=]+)/);
        if (errorMatch) {
          try {
            const binary = atob(errorMatch[1]);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            throw new Error(new TextDecoder('utf-8').decode(bytes));
          } catch (error) {
            if (error instanceof Error) throw error;
            throw new Error('Yapay zekâ yanıt oluşturamadı');
          }
        }

        const displayText = accumulated
          .replace(/__KEEPALIVE__/g, '')
          .replace(/\n\n__(?:TITLE|ERROR)_B64__[A-Za-z0-9+/=]*/g, '');
        setMessages(prev => prev.map(m => (
          m.id === placeholderId ? { ...m, content: displayText } : m
        )));
      }
    } catch (error) {
      console.error('sendMessage error', error);
      if (error instanceof Error && error.message.includes('404') && error.message.includes('NOT_FOUND')) {
        Alert.alert(
          'Model Bulunamadı',
          'Seçili yapay zeka modeli artık desteklenmiyor. Lütfen ayarlar sayfasından güncel bir model seçin.',
          [{ text: 'Tamam' }]
        );
      }
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: 'Yanıt alınamadı. Lütfen tekrar deneyin.' } : m));
    } finally {
      setSending(false);
      fetchConversations();
    }
  };

  // Web-style message bubble (birebir web'deki gibi)
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const itemAttachments = item.attachments ?? [];
    return (
      <Animated.View
        entering={FadeInDown.springify().damping(18).stiffness(200)}
        style={{
          flexDirection: 'row',
          width: '100%',
          marginBottom: 4,
          paddingVertical: 10,
          paddingHorizontal: 16,
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          gap: 8,
        }}
      >
        {/* Assistant avatar — matches AssistantAvatar.tsx */}
        {!isUser && (
          <View style={{
            width: 30, height: 30, borderRadius: 8,
            backgroundColor: C.brand,
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            {assistantIcon === 'robot' ? (
              <Bot color="#fff" size={14} />
            ) : assistantIcon === 'brain' ? (
              <Brain color="#fff" size={14} />
            ) : assistantIcon === 'pulse' ? (
              <Activity color="#fff" size={14} />
            ) : assistantIcon === 'my-logo' ? (
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>MY</Text>
            ) : (
              <Sparkles color="#fff" size={14} />
            )}
          </View>
        )}

        <View style={{ maxWidth: '90%', flexShrink: 1 }}>
          <MessageAttachments
            apiUrl={API_URL}
            attachments={itemAttachments}
            authorization={authorization}
            onOpenFile={openAttachmentFile}
            onOpenImage={setPreviewImage}
          />

          {!isUser && (
            <View style={{ alignItems: 'flex-start', marginBottom: 6, marginLeft: 4 }}>
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => DeviceEventEmitter.emit('showMedicalDisclaimer')}
                style={{ 
                  flexDirection: 'row', alignItems: 'center', 
                  backgroundColor: '#f3f4f6', 
                  paddingHorizontal: 8, paddingVertical: 4, 
                  borderRadius: 12,
                  borderWidth: 1, borderColor: '#e5e7eb'
                }}
              >
                <AlertCircle color="#9ca3af" size={11} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: '500' }}>Tıbbi geçerliliği yoktur</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: '500', marginLeft: 4, textDecorationLine: 'underline' }}>Detaylar</Text>
                <ChevronRight color="#9ca3af" size={11} style={{ marginLeft: 1 }} />
              </TouchableOpacity>
            </View>
          )}

          {(item.content !== '' || !isUser) && (
            <View
              style={{
                paddingHorizontal: 14, paddingVertical: 10,
                borderRadius: 16,
                borderBottomRightRadius: isUser ? 4 : 16,
                borderBottomLeftRadius: isUser ? 16 : 4,
                backgroundColor: isUser ? C.brand : C.bubbleAssistant,
              }}
            >
              {item.content === '' && !isUser ? (
                <View style={{ paddingVertical: 4, paddingHorizontal: 2 }}>
                  <TypingIndicator color={C.brand} dotSize={6} />
                </View>
              ) : (
                <MarkdownMessage
                  apiOrigin={API_ORIGIN}
                  authorization={authorization}
                  content={isUser ? item.content : stripAppointmentPicker(item.content)}
                  isStreaming={!isUser && sending && item.id.startsWith('placeholder-')}
                  isUser={isUser}
                  accentColor={C.brand}
                  accentLight={C.brandLight}
                  onImagePress={(uri, fileName, mimeType, imageAuthorization) => {
                    setPreviewImage({
                      uri,
                      fileName,
                      mimeType,
                      authorization: imageAuthorization,
                    });
                  }}
                  onLinkPress={openMarkdownLink}
                />
              )}
            </View>
          )}

          {!isUser && hasAppointmentPicker(item.content) && !sending && messages[messages.length - 1]?.id === item.id && (
            <AppointmentPicker<Message>
              apiUrl={API_URL}
              authorization={authorization}
              colors={C}
              conversationId={conversationId}
              onBooked={(booked) => {
                if (booked.length) setMessages(prev => [...prev, ...booked]);
                void fetchConversations();
              }}
            />
          )}
        </View>
      </Animated.View>
    );
  };

  const openConversationActions = async (conversation: Conversation) => {
    setConversationMenu(conversation);
    setConversationTitleDraft(conversation.title);
    setShareActive(false);
    setShareId(null);
    try {
      const res = await axios.get(`${API_URL}/conversations/${conversation.id}/share`, { headers });
      setShareActive(!!res.data.shared);
      setShareId(res.data.shareId ?? null);
    } catch (e) { /* ignore */ }
  };

  const toggleShare = async () => {
    if (!conversationMenu) return;
    setShareLoading(true);
    try {
      const res = await axios.post(`${API_URL}/conversations/${conversationMenu.id}/share`, {}, { headers });
      setShareActive(!!res.data.shared);
      setShareId(res.data.shareId ?? null);
    } catch (e) {
      console.warn('Paylaşım hatası', e);
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareId) return;
    const url = `${SHARE_ORIGIN}/share/${shareId}`;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(url, { dialogTitle: 'Sohbet linkini paylaş', UTI: 'public.url' });
    } else {
      await Clipboard.setStringAsync(url);
      Toast.show({ type: 'success', text1: 'Link kopyalandı!', text2: url, visibilityTime: 3000 });
    }
  };

  const renderConversationItem = (item: Conversation, nested = false) => {
    const isActive = item.id === conversationId;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => selectConversation(item)}
        onLongPress={() => openConversationActions(item)}
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingLeft: nested ? 24 : 12,
          paddingRight: 6,
          paddingVertical: 8,
          marginHorizontal: 4,
          marginVertical: 1,
          borderRadius: 8,
          backgroundColor: isActive ? '#ffffff' : 'transparent',
          borderWidth: isActive ? 1 : 0,
          borderColor: isActive ? C.borderPrimary : 'transparent',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isActive ? 0.06 : 0,
          shadowRadius: 2,
          elevation: isActive ? 1 : 0,
        }}
        activeOpacity={0.6}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1, fontSize: 14,
            color: isActive ? C.textPrimary : '#374151',
            fontWeight: isActive ? '500' : '400',
          }}
        >
          {item.title || 'Yeni Sohbet'}
        </Text>
        <TouchableOpacity
          onPress={() => openConversationActions(item)}
          accessibilityLabel="Sohbet seçenekleri"
          hitSlop={8}
          style={{ padding: 5, borderRadius: 6 }}
        >
          <MoreHorizontal size={16} color={C.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const folderIds = new Set(folders.map((folder) => folder.id));
  const freeConversations = conversations.filter((conversation) => (
    !conversation.folderId || !folderIds.has(conversation.folderId)
  ));
  const canSubmit = imageMode
    ? input.trim().length > 0
    : input.trim().length > 0 || pendingAttachments.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bgPrimary }}>
      <StatusBar barStyle="light-content" backgroundColor="#07090f" />

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <Animated.View
          style={[{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000', zIndex: 10,
          }, overlayStyle]}
          pointerEvents="auto"
        >
          <Pressable style={{ flex: 1 }} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar — matches web sidebar exactly */}
      {sidebarOpen && (
        <Animated.View
          style={[{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
            zIndex: 11, backgroundColor: C.bgSidebar,
            borderRightWidth: 1, borderRightColor: C.borderPrimary,
            flexDirection: 'column',
          }, sidebarStyle]}
        >
          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}
              onPress={closeSidebar}
            >
              <BrandLogo size={32} />
              <Text style={{ fontWeight: '600', fontSize: 14, color: C.textPrimary }}>MY FizyoAI</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={createNewConversation}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 12, paddingVertical: 8,
                  backgroundColor: C.brandLight, borderRadius: 8,
                }}
                activeOpacity={0.7}
              >
                <Plus size={16} color={C.brand} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: C.brandDark }}>Yeni Sohbet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowNewFolder(true)}
                accessibilityLabel="Yeni klasör"
                style={{
                  paddingHorizontal: 10, paddingVertical: 8,
                  borderRadius: 8, backgroundColor: 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FolderPlus size={18} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {showNewFolder && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                <TextInput
                  autoFocus
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  onSubmitEditing={() => void createFolder()}
                  placeholder="Klasör adı..."
                  placeholderTextColor={C.textTertiary}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    color: C.textPrimary,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 9,
                    paddingVertical: 7,
                  }}
                />
                <TouchableOpacity
                  onPress={() => void createFolder()}
                  style={{ backgroundColor: C.brand, borderRadius: 8, padding: 7 }}
                  accessibilityLabel="Klasörü ekle"
                >
                  <Check size={15} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowNewFolder(false); setNewFolderName(''); }}
                  style={{ backgroundColor: '#e5e7eb', borderRadius: 8, padding: 7 }}
                  accessibilityLabel="İptal"
                >
                  <X size={15} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {folders.map((folder) => {
              const folderConversations = conversations.filter((conversation) => conversation.folderId === folder.id);
              const isOpen = openFolders.has(folder.id);
              const isRenaming = renamingFolderId === folder.id;

              return (
                <View key={folder.id} style={{ marginBottom: 2 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 8, paddingVertical: 7,
                    borderRadius: 8,
                  }}>
                    <TouchableOpacity
                      onPress={() => toggleFolder(folder.id)}
                      style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <ChevronRight
                        size={14}
                        color={C.textTertiary}
                        style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
                      />
                      {isOpen
                        ? <FolderOpen size={16} color="#eab308" fill="rgba(234,179,8,0.16)" />
                        : <Folder size={16} color="#eab308" fill="rgba(234,179,8,0.16)" />}

                      {isRenaming ? (
                        <TextInput
                          autoFocus
                          value={folderNameDraft}
                          onChangeText={setFolderNameDraft}
                          onSubmitEditing={() => void renameFolder(folder.id)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 12,
                            color: C.textPrimary,
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#93c5fd',
                            borderRadius: 6,
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                          }}
                        />
                      ) : (
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: '500', color: '#374151' }}>
                          {folder.name}
                        </Text>
                      )}
                      <Text style={{ fontSize: 10, color: C.textTertiary }}>{folderConversations.length}</Text>
                    </TouchableOpacity>

                    {isRenaming ? (
                      <>
                        <TouchableOpacity onPress={() => void renameFolder(folder.id)} style={{ padding: 5 }}>
                          <Check size={14} color={C.brand} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setRenamingFolderId(null)} style={{ padding: 5 }}>
                          <X size={14} color={C.textTertiary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => { setRenamingFolderId(folder.id); setFolderNameDraft(folder.name); }}
                          style={{ padding: 5 }}
                          accessibilityLabel="Klasörü yeniden adlandır"
                        >
                          <Pencil size={13} color={C.textTertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => confirmDeleteFolder(folder)}
                          style={{ padding: 5 }}
                          accessibilityLabel="Klasörü sil"
                        >
                          <Trash2 size={13} color={C.textTertiary} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {isOpen && (
                    <View style={{ paddingBottom: 4 }}>
                      {folderConversations.length > 0 ? (
                        folderConversations.map((conversation) => renderConversationItem(conversation, true))
                      ) : (
                        <Text style={{ fontSize: 11, fontStyle: 'italic', color: C.textTertiary, paddingLeft: 40, paddingVertical: 5 }}>
                          Sohbet taşımak için ••• menüsünü kullanın
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {freeConversations.map((conversation) => renderConversationItem(conversation))}

            {conversations.length === 0 && folders.length === 0 && (
              <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', paddingTop: 16, paddingHorizontal: 16 }}>
                Henüz sohbet yok
              </Text>
            )}
          </ScrollView>

          {/* Footer — matches web sidebar footer */}
          <View style={{
            borderTopWidth: 1, borderTopColor: C.borderPrimary,
            paddingHorizontal: 16, paddingVertical: 12,
            paddingBottom: insets.bottom + 12,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              onPress={logout}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={16} color={C.textSecondary} />
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>

          {/* Cerilas footer strip */}
          <View style={{ backgroundColor: C.brand, paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 9 }}>Cerilas ♥ www.cerilas.com</Text>
          </View>
        </Animated.View>
      )}

      <Modal
        visible={conversationMenu !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setConversationMenu(null)}
      >
        <Pressable
          onPress={() => setConversationMenu(null)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              maxHeight: '78%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingTop: 16,
              paddingHorizontal: 18,
              paddingBottom: insets.bottom + 18,
            }}
          >
            {conversationMenu && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.textPrimary }}>
                    Sohbet Seçenekleri
                  </Text>
                  <TouchableOpacity onPress={() => setConversationMenu(null)} style={{ padding: 5 }}>
                    <X size={20} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <TextInput
                    value={conversationTitleDraft}
                    onChangeText={setConversationTitleDraft}
                    onSubmitEditing={() => void renameConversation()}
                    style={{
                      flex: 1,
                      color: C.textPrimary,
                      backgroundColor: C.bgSecondary,
                      borderWidth: 1,
                      borderColor: C.borderPrimary,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 14,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => void renameConversation()}
                    style={{ padding: 10, borderRadius: 10, backgroundColor: C.brandLight }}
                    accessibilityLabel="Sohbet adını kaydet"
                  >
                    <Pencil size={17} color={C.brand} />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 7 }}>
                  KLASÖRE TAŞI
                </Text>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => void moveConversation(conversationMenu, null)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
                  >
                    <Inbox size={18} color={C.textSecondary} />
                    <Text style={{ flex: 1, fontSize: 14, color: C.textPrimary }}>Klasörsüz</Text>
                    {conversationMenu.folderId === null && <Check size={17} color={C.brand} />}
                  </TouchableOpacity>

                  {folders.map((folder) => (
                    <TouchableOpacity
                      key={folder.id}
                      onPress={() => void moveConversation(conversationMenu, folder.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}
                    >
                      <Folder size={18} color="#eab308" fill="rgba(234,179,8,0.16)" />
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: C.textPrimary }}>{folder.name}</Text>
                      {conversationMenu.folderId === folder.id && <Check size={17} color={C.brand} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Paylaş Bölümü */}
                <View style={{ borderTopWidth: 1, borderTopColor: C.borderPrimary, marginTop: 12, paddingTop: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 8 }}>
                    PAYLAŞ
                  </Text>
                  <TouchableOpacity
                    onPress={() => void toggleShare()}
                    disabled={shareLoading}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: shareActive ? 'rgba(22,163,74,0.1)' : C.bgSecondary,
                    }}>
                      {shareLoading
                        ? <ActivityIndicator size="small" color={C.brand} />
                        : <Share2 size={18} color={shareActive ? '#16a34a' : C.textSecondary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: shareActive ? '#16a34a' : C.textPrimary }}>
                        {shareActive ? 'Paylaşım Aktif' : 'Paylaşım Linki Oluştur'}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>
                        {shareActive ? 'Herkese açık link oluşturuldu' : 'Sohbeti herkesle paylaşın'}
                      </Text>
                    </View>
                    {shareActive && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
                    )}
                  </TouchableOpacity>

                  {shareActive && shareId && (
                    <TouchableOpacity
                      onPress={() => void copyShareLink()}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: C.bgSecondary, borderRadius: 10,
                        paddingHorizontal: 12, paddingVertical: 9, marginTop: 6,
                      }}
                    >
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: C.textTertiary }}>
                        {`${API_ORIGIN}/share/${shareId}`}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: C.brand }}>Kopyala</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => confirmDeleteConversation(conversationMenu)}
                  style={{
                    marginTop: 12,
                    paddingVertical: 11,
                    borderTopWidth: 1,
                    borderTopColor: C.borderPrimary,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <Trash2 size={17} color="#dc2626" />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#dc2626' }}>Sohbeti Sil</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={toolsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setToolsOpen(false)}
      >
        <Pressable
          onPress={() => setToolsOpen(false)}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' }}
        >
          <Pressable
            onPress={event => event.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ flex: 1, color: C.textPrimary, fontSize: 16, fontWeight: '700' }}>
                Araçlar
              </Text>
              <TouchableOpacity onPress={() => setToolsOpen(false)} style={{ padding: 6 }}>
                <X size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              disabled={uploading}
              onPress={() => void pickImages()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff',
              }}>
                <ImageIcon size={19} color={C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: '600' }}>Görsel Yükle</Text>
                <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 2 }}>JPG, PNG, GIF, WebP veya HEIC</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={uploading}
              onPress={() => void pickDocuments()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2',
              }}>
                <FileUp size={19} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: '600' }}>Dosya / PDF Yükle</Text>
                <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 2 }}>Yapay zekâ dosyanın içeriğini inceleyebilir</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                const next = !imageMode;
                setImageMode(next);
                if (next) {
                  setPendingAttachments([]);
                  setUploadError('');
                }
                setToolsOpen(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf5ff',
              }}>
                <WandSparkles size={19} color="#7e22ce" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#6b21a8', fontSize: 14, fontWeight: '600' }}>Görsel Üret</Text>
                <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 2 }}>Açıklamanızdan yeni bir görsel oluşturur</Text>
              </View>
              {imageMode && <Check size={18} color="#7e22ce" />}
            </TouchableOpacity>

            {/* Model Seçimi — sadece admin/fizyoterapist */}
            {user?.role !== 'patient' && (
              <View style={{ marginTop: 4 }}>
                <View style={{ height: 1, backgroundColor: C.borderPrimary, marginVertical: 8 }} />
                <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Yapay Zeka Modeli</Text>
                <ScrollView
                  style={{ maxHeight: 180 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {aiModels.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => { setSelectedModel(m.id); setToolsOpen(false); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 10,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: selectedModel === m.id ? 'rgba(60,170,222,0.12)' : C.bgSecondary,
                      }}>
                        <Sparkles size={17} color={selectedModel === m.id ? '#3caade' : C.textTertiary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selectedModel === m.id ? '#3caade' : C.textPrimary, fontSize: 14, fontWeight: selectedModel === m.id ? '700' : '500' }}>{m.label}</Text>
                      </View>
                      {selectedModel === m.id && <Check size={16} color="#3caade" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' }}>
          <View style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
          }}>
            <TouchableOpacity
              disabled={!previewImage || resourceBusy}
              onPress={() => {
                if (!previewImage) return;
                void shareResource(
                  previewImage.downloadUri ?? previewImage.uri,
                  previewImage.fileName,
                  previewImage.mimeType,
                  previewImage.authorization,
                );
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9,
              }}
            >
              {resourceBusy
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Download size={17} color="#ffffff" />}
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Kaydet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={{
                width: 38, height: 38, borderRadius: 9,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Pressable
            onPress={() => setPreviewImage(null)}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            {previewImage && (
              <Image
                source={{
                  uri: previewImage.uri,
                  ...(previewImage.authorization
                    ? { headers: { Authorization: previewImage.authorization } }
                    : {}),
                }}
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Main content */}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#07090f' }} edges={['top']}>
        <AppHeader
          sideWidth={isGuest ? 96 : 48}
          left={isGuest ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 32,
                paddingHorizontal: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.16)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
              accessibilityLabel={`Misafir modu, ${Math.max(0, MAX_GUEST_QUESTIONS - guestUsedCount)} soru hakkı kaldı`}
            >
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: guestLimitReached ? '#f87171' : '#4ade80',
              }} />
              <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                {Math.max(0, MAX_GUEST_QUESTIONS - guestUsedCount)}/{MAX_GUEST_QUESTIONS}
              </Text>
              <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' }}>
                hak
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={openSidebar} style={{ padding: 8 }} accessibilityLabel="Menüyü aç">
              <Menu size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
          right={isGuest ? (
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
              hitSlop={6}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                height: 32,
                paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: C.brand,
              }}
              accessibilityLabel="Giriş yap"
            >
              <LogIn size={14} color="#ffffff" />
              <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Giriş</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={createNewConversation} style={{ padding: 8 }} accessibilityLabel="Yeni sohbet">
              <Plus size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
        />

        <View style={{ flex: 1, backgroundColor: C.bgPrimary }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.borderPrimary, borderTopColor: C.brand }} />
            </View>
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
            >
            {messages.length === 0 ? (
              isGuest ? (
                <ScrollView
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 28,
                  }}
                >
                  <View style={{ width: '100%', maxWidth: 440, alignItems: 'center' }}>
                    <View style={{
                      width: 60, height: 60, borderRadius: 16,
                      backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    }}>
                      <Sparkles color="#fff" size={30} />
                    </View>
                    <Text style={{ fontSize: 21, fontWeight: '700', color: C.textPrimary, marginBottom: 6, textAlign: 'center' }}>
                      MY FizioAI'ye Sorun
                    </Text>
                    <Text style={{ fontSize: 13.5, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20, paddingHorizontal: 8 }}>
                      Üye olmadan veya giriş yapmadan merak ettiğiniz konuları danışabilirsiniz. Misafir kullanıcılar için 5 soru-cevap hakkı tanımlanmıştır.
                    </Text>

                    {guestLimitReached ? (
                      <View style={{
                        width: '100%',
                        backgroundColor: C.bgSecondary,
                        borderWidth: 1,
                        borderColor: C.borderPrimary,
                        borderRadius: 18,
                        padding: 18,
                        alignItems: 'center',
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 8, textAlign: 'center' }}>
                          5 Soru-Cevap Misafir Hakkınız Doldu
                        </Text>
                        <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 16 }}>
                          MY FizioAI uygulaması MyFizyoterapi & MyFizyoPilates kliniği danışanlarına özeldir. Daha fazla soru hakkı ve kişisel takip için lütfen önce kliniğimize başvurunuz.
                        </Text>
                        <TouchableOpacity
                          onPress={() => void openClinicWhatsApp()}
                          activeOpacity={0.85}
                          style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            backgroundColor: '#16a34a',
                            paddingVertical: 13,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            marginBottom: 10,
                          }}
                        >
                          <MessageCircle size={18} color="#ffffff" />
                          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                            Daha Fazla Hak İçin Kliniğe Başvur (WhatsApp)
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push('/login')}
                          activeOpacity={0.8}
                          style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderWidth: 1,
                            borderColor: C.borderPrimary,
                            backgroundColor: C.bgPrimary,
                            paddingVertical: 11,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                          }}
                        >
                          <LogIn size={16} color={C.textPrimary} />
                          <Text style={{ color: C.textPrimary, fontSize: 13, fontWeight: '600' }}>
                            Mevcut Danışan Girişi Yap
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{
                        width: '100%',
                        backgroundColor: C.bgSecondary,
                        borderWidth: 1,
                        borderColor: C.borderPrimary,
                        borderRadius: 18,
                        padding: 14,
                      }}>
                        <TextInput
                          style={{
                            fontSize: 15,
                            color: C.textPrimary,
                            minHeight: 88,
                            maxHeight: 150,
                            textAlignVertical: 'top',
                            paddingHorizontal: 6,
                            paddingVertical: 6,
                            lineHeight: 21,
                          }}
                          placeholder="Danışmak istediğiniz soruyu buraya yazın..."
                          placeholderTextColor={C.textTertiary}
                          value={input}
                          onChangeText={setInput}
                          multiline
                          blurOnSubmit={false}
                        />
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 10,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: C.borderPrimary,
                        }}>
                          <Text style={{ fontSize: 12, color: C.textTertiary, fontWeight: '500' }}>
                            Kalan hak: {Math.max(0, MAX_GUEST_QUESTIONS - guestUsedCount)} / {MAX_GUEST_QUESTIONS}
                          </Text>
                          <TouchableOpacity
                            onPress={() => void sendMessage()}
                            disabled={!input.trim() || sending}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: input.trim() && !sending ? C.brand : C.borderPrimary,
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 12,
                              opacity: input.trim() && !sending ? 1 : 0.5,
                            }}
                          >
                            {sending ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <>
                                <Text style={{ color: '#ffffff', fontSize: 13.5, fontWeight: '600' }}>Soruyu Gönder</Text>
                                <Send color="#ffffff" size={15} />
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <Text style={{ textAlign: 'center', fontSize: 10, color: C.textTertiary, marginTop: 16, marginHorizontal: 12, lineHeight: 14 }}>
                      UYARI: MY FizioAI tıbbi bir cihaz değildir. Teşhis koyamaz ve tıbbi kararlar için tek kaynak olmamalıdır. Lütfen hekiminize danışınız.
                    </Text>
                  </View>
                </ScrollView>
              ) : (
                // Welcome screen — matches web WelcomeScreen.tsx
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 }}
                >
                  <View style={{
                    width: 64, height: 64, borderRadius: 16,
                    backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  }}>
                    {assistantIcon === 'robot' ? (
                      <Bot color="#fff" size={32} />
                    ) : assistantIcon === 'brain' ? (
                      <Brain color="#fff" size={32} />
                    ) : assistantIcon === 'pulse' ? (
                      <Activity color="#fff" size={32} />
                    ) : assistantIcon === 'my-logo' ? (
                      <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>MY</Text>
                    ) : (
                      <Sparkles color="#fff" size={32} />
                    )}
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 8, textAlign: 'center' }}>
                    {user?.name ? `Merhaba, ${user.name.split(' ')[0]}` : 'Merhaba!'}
                  </Text>
                  <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 }}>
                    Randevu, konum ve klinik bilgileri için kliniğin dijital asistanı.
                  </Text>
                  <ClinicQuickActions colors={C} busyKey={quickBusy} onSelect={(key) => void runQuickAction(key)} />
                </ScrollView>
              )
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                extraData={sending}
                contentContainerStyle={{ paddingVertical: 8 }}
                style={{ flex: 1, backgroundColor: C.bgPrimary }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                showsVerticalScrollIndicator={false}
              />
            )}

            {(!isGuest || messages.length > 0) && (
              <View style={{
                paddingHorizontal: 12, paddingTop: 10, paddingBottom: insets.bottom + 10,
                borderTopWidth: 1, borderTopColor: C.borderPrimary,
                backgroundColor: C.bgPrimary,
              }}>
                {isGuest && guestLimitReached && !sending ? (
                  <View style={{
                    backgroundColor: C.bgSecondary,
                    borderWidth: 1,
                    borderColor: C.borderPrimary,
                    borderRadius: 16,
                    padding: 14,
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.textPrimary, marginBottom: 4, textAlign: 'center' }}>
                      5 Soru-Cevap Misafir Hakkınız Doldu
                    </Text>
                    <Text style={{ fontSize: 12.5, color: C.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 12 }}>
                      Uygulamamız MyFizyoterapi & MyFizyoPilates kliniği danışanlarına özeldir. Daha fazla soru hakkı için lütfen önce kliniğimize başvurunuz.
                    </Text>
                    <TouchableOpacity
                      onPress={() => void openClinicWhatsApp()}
                      activeOpacity={0.85}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: '#16a34a',
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        marginBottom: 8,
                      }}
                    >
                      <MessageCircle size={17} color="#ffffff" />
                      <Text style={{ color: '#ffffff', fontSize: 13.5, fontWeight: '700' }}>
                        Daha Fazla Hak İçin Kliniğe Başvur (WhatsApp)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push('/login')}
                      activeOpacity={0.8}
                      style={{
                        width: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: C.borderPrimary,
                        backgroundColor: C.bgPrimary,
                        paddingVertical: 9,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                      }}
                    >
                      <LogIn size={15} color={C.textPrimary} />
                      <Text style={{ color: C.textPrimary, fontSize: 12.5, fontWeight: '600' }}>
                        Mevcut Danışan Girişi Yap
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {!isGuest && messages.length > 0 && !sending && (
                      <ClinicQuickChips colors={C} busyKey={quickBusy} onSelect={(key) => void runQuickAction(key)} />
                    )}

                    {!isGuest && (
                      <PendingAttachments
                        attachments={pendingAttachments}
                        onRemove={id => setPendingAttachments(current => (
                          current.filter(attachment => attachment.id !== id)
                        ))}
                      />
                    )}

                    {uploadError !== '' && (
                      <Text style={{ color: '#dc2626', fontSize: 11, marginBottom: 7 }}>
                        {uploadError}
                      </Text>
                    )}

                    {!isGuest && imageMode && (
                      <View style={{
                        alignItems: 'center', alignSelf: 'flex-start',
                        backgroundColor: '#f3e8ff', borderRadius: 999,
                        flexDirection: 'row', gap: 5, marginBottom: 8,
                        paddingHorizontal: 9, paddingVertical: 5,
                      }}>
                        <WandSparkles size={13} color="#7e22ce" />
                        <Text style={{ color: '#7e22ce', fontSize: 11, fontWeight: '600' }}>Görsel Üret</Text>
                        <TouchableOpacity onPress={() => setImageMode(false)} hitSlop={8}>
                          <X size={13} color="#7e22ce" />
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                      {!isGuest && (
                        <TouchableOpacity
                          onPress={() => setToolsOpen(true)}
                          disabled={sending || uploading}
                          style={{
                            width: 42, height: 42, borderRadius: 13,
                            backgroundColor: imageMode || pendingAttachments.length > 0 ? C.brandLight : C.bgSecondary,
                            alignItems: 'center', justifyContent: 'center',
                            opacity: sending ? 0.4 : 1,
                          }}
                          accessibilityLabel="Dosya ve görsel araçlarını aç"
                        >
                          {uploading
                            ? <ActivityIndicator size="small" color={C.brand} />
                            : <Plus color={imageMode || pendingAttachments.length > 0 ? C.brand : C.textTertiary} size={21} />}
                        </TouchableOpacity>
                      )}

                      <View style={{
                        flex: 1,
                        flexDirection: 'row', alignItems: 'flex-end',
                        borderWidth: 1,
                        borderColor: imageMode ? '#c084fc' : C.borderPrimary,
                        borderRadius: 16, overflow: 'hidden',
                        backgroundColor: C.bgPrimary,
                      }}>
                        <TextInput
                          style={{
                            flex: 1, paddingHorizontal: 16,
                            paddingTop: Platform.OS === 'ios' ? 14 : 12, 
                            paddingBottom: Platform.OS === 'ios' ? 14 : 12,
                            fontSize: 14, color: C.textPrimary,
                            maxHeight: 84, lineHeight: 19.6,
                            minHeight: 48, textAlignVertical: 'center'
                          }}
                          placeholder={imageMode ? 'Görseli açıklayın...' : isGuest ? `Sorunuzu yazın (${Math.max(0, MAX_GUEST_QUESTIONS - guestUsedCount)} hak kaldı)...` : 'Mesaj yazın...'}
                          placeholderTextColor={C.textTertiary}
                          value={input}
                          onChangeText={setInput}
                          multiline
                          onSubmitEditing={() => void sendMessage()}
                          blurOnSubmit={false}
                        />
                        <TouchableOpacity
                          onPress={() => void sendMessage()}
                          disabled={!canSubmit || sending || uploading}
                          style={{
                            margin: 6,
                            width: 36, height: 36, borderRadius: 12,
                            backgroundColor: sending
                              ? C.brand
                              : canSubmit && !uploading
                                ? (imageMode ? '#7e22ce' : C.brand)
                                : C.bgSecondary,
                            alignItems: 'center', justifyContent: 'center',
                            opacity: sending || (canSubmit && !uploading) ? 1 : 0.35,
                          }}
                          accessibilityLabel={imageMode ? 'Görsel oluştur' : 'Mesaj gönder'}
                        >
                          {sending ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : imageMode ? (
                            <WandSparkles color="#ffffff" size={17} />
                          ) : (
                            <Send color="#ffffff" size={16} style={{ marginLeft: 1 }} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
                <Text style={{ textAlign: 'center', fontSize: 10, color: C.textTertiary, marginTop: 8, marginHorizontal: 16, lineHeight: 14 }}>
                  UYARI: MY FizioAI tıbbi bir cihaz değildir. Teşhis koyamaz ve tıbbi kararlar için tek kaynak olmamalıdır. Lütfen hekiminize danışınız.
                </Text>
              </View>
            )}
            </KeyboardAvoidingView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
