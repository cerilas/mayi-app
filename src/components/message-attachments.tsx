import React from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FileText, Paperclip, X } from 'lucide-react-native';

export interface ChatAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  filePath: string;
  fileSize?: number;
  localUri?: string;
}

export interface ChatImagePreview {
  uri: string;
  downloadUri?: string;
  fileName: string;
  mimeType: string;
  authorization?: string;
}

export function attachmentFileUrl(apiUrl: string, filePath: string) {
  const fileName = filePath.split('/').filter(Boolean).pop() ?? filePath;
  return `${apiUrl}/files/${encodeURIComponent(fileName)}`;
}

function attachmentImageSource(
  attachment: ChatAttachment,
  apiUrl: string,
  authorization: string,
) {
  if (attachment.localUri) return { uri: attachment.localUri };
  return {
    uri: attachmentFileUrl(apiUrl, attachment.filePath),
    headers: { Authorization: authorization },
  };
}

export function MessageAttachments({
  apiUrl,
  attachments,
  authorization,
  onOpenFile,
  onOpenImage,
}: {
  apiUrl: string;
  attachments: ChatAttachment[];
  authorization: string;
  onOpenFile: (attachment: ChatAttachment) => void;
  onOpenImage: (image: ChatImagePreview) => void;
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter(attachment => attachment.mimeType.startsWith('image/'));
  const files = attachments.filter(attachment => !attachment.mimeType.startsWith('image/'));

  return (
    <View style={{ gap: 7, marginBottom: 5 }}>
      {images.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {images.map(attachment => {
            const uri = attachment.localUri
              ?? attachmentFileUrl(apiUrl, attachment.filePath);
            return (
              <TouchableOpacity
                key={attachment.id}
                activeOpacity={0.82}
                onPress={() => onOpenImage({
                  uri,
                  downloadUri: attachmentFileUrl(apiUrl, attachment.filePath),
                  fileName: attachment.fileName,
                  mimeType: attachment.mimeType,
                  authorization,
                })}
                style={{
                  width: 118,
                  height: 118,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6',
                }}
                accessibilityLabel={`${attachment.fileName} görselini aç`}
              >
                <Image
                  source={attachmentImageSource(attachment, apiUrl, authorization)}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {files.map(attachment => (
        <TouchableOpacity
          key={attachment.id}
          onPress={() => onOpenFile(attachment)}
          activeOpacity={0.72}
          style={{
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: attachment.mimeType === 'application/pdf' ? '#fef2f2' : '#f8fafc',
            borderColor: attachment.mimeType === 'application/pdf' ? '#fecaca' : '#cbd5e1',
            borderRadius: 9,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 8,
            maxWidth: 240,
            paddingHorizontal: 11,
            paddingVertical: 9,
          }}
        >
          {attachment.mimeType === 'application/pdf'
            ? <FileText size={18} color="#dc2626" />
            : <Paperclip size={18} color="#475569" />}
          <Text
            numberOfLines={1}
            style={{
              color: attachment.mimeType === 'application/pdf' ? '#b91c1c' : '#334155',
              flexShrink: 1,
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            {attachment.fileName}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function PendingAttachments({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
    >
      {attachments.map(attachment => (
        attachment.mimeType.startsWith('image/') ? (
          <View
            key={attachment.id}
            style={{
              width: 58,
              height: 58,
              borderRadius: 9,
              borderWidth: 1,
              borderColor: '#d1d5db',
            }}
          >
            <Image
              source={{ uri: attachment.localUri }}
              resizeMode="cover"
              style={{ width: '100%', height: '100%', borderRadius: 8 }}
            />
            <TouchableOpacity
              onPress={() => onRemove(attachment.id)}
              accessibilityLabel={`${attachment.fileName} ekini kaldır`}
              style={{
                alignItems: 'center',
                backgroundColor: '#374151',
                borderRadius: 9,
                height: 18,
                justifyContent: 'center',
                position: 'absolute',
                right: -5,
                top: -5,
                width: 18,
              }}
            >
              <X size={11} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            key={attachment.id}
            style={{
              alignItems: 'center',
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              borderRadius: 9,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 7,
              maxWidth: 210,
              paddingHorizontal: 10,
              paddingVertical: 9,
            }}
          >
            <FileText size={17} color="#dc2626" />
            <Text numberOfLines={1} style={{ color: '#7f1d1d', flexShrink: 1, fontSize: 12 }}>
              {attachment.fileName}
            </Text>
            <TouchableOpacity onPress={() => onRemove(attachment.id)} hitSlop={8}>
              <X size={15} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )
      ))}
    </ScrollView>
  );
}
