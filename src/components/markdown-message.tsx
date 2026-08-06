import React, { useMemo } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import {
  MarkdownStream,
  type MarkdownStyleMap,
  type RenderRules,
} from '@ronradtke/react-native-markdown-display';

interface MarkdownMessageProps {
  apiOrigin?: string;
  authorization?: string;
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
  onImagePress?: (uri: string, fileName: string, mimeType: string, authorization?: string) => void;
  onLinkPress?: (url: string) => void;
}

const monoFont = Platform.select({
  ios: 'Courier New',
  android: 'monospace',
  default: 'monospace',
});

function createMarkdownStyles(isUser: boolean): MarkdownStyleMap {
  const textColor = isUser ? '#ffffff' : '#1f2937';
  const secondaryTextColor = isUser ? 'rgba(255,255,255,0.9)' : '#64748b';
  const subtleBorderColor = isUser ? 'rgba(255,255,255,0.3)' : '#cbd5e1';

  return {
    body: {
      color: textColor,
      flexShrink: 1,
      fontSize: 14,
      lineHeight: 22,
      maxWidth: '100%',
    },
    text: { color: textColor, fontSize: 14, lineHeight: 22 },
    paragraph: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      marginBottom: 10,
      marginTop: 0,
      width: 'auto',
    },
    strong: { color: textColor, fontWeight: '600' },
    em: { color: textColor, fontStyle: 'italic' },
    s: { color: textColor, textDecorationLine: 'line-through' },
    heading1: {
      color: textColor,
      flexDirection: 'row',
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 26,
      marginBottom: 8,
      marginTop: 12,
    },
    heading2: {
      color: textColor,
      flexDirection: 'row',
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      marginBottom: 8,
      marginTop: 12,
    },
    heading3: {
      color: textColor,
      flexDirection: 'row',
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      marginBottom: 7,
      marginTop: 10,
    },
    heading4: {
      color: textColor,
      flexDirection: 'row',
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 21,
      marginBottom: 6,
      marginTop: 10,
    },
    bullet_list: { marginBottom: 8, marginTop: 6 },
    ordered_list: { marginBottom: 8, marginTop: 6 },
    list_item: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginVertical: 2,
    },
    bullet_list_icon: {
      color: textColor,
      marginLeft: 6,
      marginRight: 9,
    },
    ordered_list_icon: {
      color: textColor,
      marginLeft: 6,
      marginRight: 9,
    },
    bullet_list_content: { flex: 1 },
    ordered_list_content: { flex: 1 },
    code_inline: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
      borderColor: 'transparent',
      borderRadius: 4,
      borderWidth: 0,
      color: textColor,
      fontFamily: monoFont,
      fontSize: 13,
      padding: 0,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    code_block: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.3)' : '#1e293b',
      borderColor: 'transparent',
      borderRadius: 8,
      borderWidth: 0,
      color: '#e2e8f0',
      fontFamily: monoFont,
      fontSize: 12,
      lineHeight: 18,
      marginVertical: 8,
      padding: 12,
    },
    fence: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.3)' : '#1e293b',
      borderColor: isUser ? 'rgba(255,255,255,0.15)' : '#334155',
      borderRadius: 8,
      borderWidth: 1,
      marginVertical: 8,
      maxWidth: '100%',
      overflow: 'hidden',
    },
    fence_header: {
      alignItems: 'center',
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : '#0f172a',
      borderBottomColor: isUser ? 'rgba(255,255,255,0.15)' : '#334155',
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    fence_language_label: {
      color: '#cbd5e1',
      fontFamily: monoFont,
      fontSize: 11,
    },
    fence_code: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.3)' : '#1e293b',
      padding: 12,
    },
    fence_token: {
      fontFamily: monoFont,
      fontSize: 12,
      lineHeight: 18,
    },
    blockquote: {
      backgroundColor: 'transparent',
      borderColor: subtleBorderColor,
      borderLeftWidth: 3,
      marginVertical: 8,
      paddingLeft: 12,
      paddingRight: 4,
    },
    link: {
      color: isUser ? '#93c5fd' : '#3b82f6',
      marginBottom: 0,
      textDecorationLine: 'underline',
      fontSize: 14,
      lineHeight: 22,
    },
    hr: {
      backgroundColor: subtleBorderColor,
      height: 1,
      marginVertical: 12,
    },
    table: {
      borderColor: subtleBorderColor,
      borderRadius: 4,
      borderWidth: 1,
      marginVertical: 8,
      maxWidth: '100%',
    },
    tr: {
      borderBottomColor: subtleBorderColor,
      borderBottomWidth: 1,
      flexDirection: 'row',
    },
    th: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.12)' : '#e2e8f0',
      flex: 1,
      padding: 6,
    },
    td: { flex: 1, padding: 6 },
    image: {
      borderRadius: 8,
      flex: 1,
      marginTop: 8,
      maxWidth: '100%',
    },
    softbreak: { color: secondaryTextColor },
  };
}

const assistantStyles = createMarkdownStyles(false);
const userStyles = createMarkdownStyles(true);

function resolveMarkdownUri(uri: string, apiOrigin?: string) {
  if (uri.startsWith('/') && apiOrigin) return `${apiOrigin}${uri}`;
  return uri;
}

const paragraphRule: NonNullable<RenderRules['paragraph']> = (
  node,
  children,
  parentNodes,
  styles,
) => {
    const immediateParent = parentNodes[0];
    const lastChild = immediateParent?.children[immediateParent.children.length - 1];
    const isLastChild = lastChild?.key === node.key;
    const isListParagraph = parentNodes.some(parent => parent.type === 'list_item');

    return (
      <View
        key={node.key}
        style={[
          styles._VIEW_SAFE_paragraph,
          isLastChild && { marginBottom: 0 },
          isListParagraph && { marginBottom: 0, marginTop: 0 },
        ]}
      >
        {children}
      </View>
    );
};

export function MarkdownMessage({
  apiOrigin,
  authorization,
  content,
  isStreaming = false,
  isUser = false,
  onImagePress,
  onLinkPress,
}: MarkdownMessageProps) {
  const textColor = isUser ? '#ffffff' : '#1f2937';
  const rules = useMemo<RenderRules>(() => ({
    paragraph: paragraphRule,
    image: (node) => {
      const rawUri = node.attributes.src;
      if (!rawUri) return null;

      const uri = resolveMarkdownUri(rawUri, apiOrigin);
      const mimeType = uri.match(/^data:([^;,]+)/)?.[1]
        ?? (/\.webp(?:$|[?#])/i.test(uri) ? 'image/webp'
          : /\.gif(?:$|[?#])/i.test(uri) ? 'image/gif'
            : /\.jpe?g(?:$|[?#])/i.test(uri) ? 'image/jpeg'
              : 'image/png');
      const needsAuthorization = Boolean(
        authorization
        && apiOrigin
        && uri.startsWith(apiOrigin),
      );
      const imageSource = needsAuthorization && authorization
        ? { uri, headers: { Authorization: authorization } }
        : { uri };

      return (
        <Pressable
          key={node.key}
          onPress={() => onImagePress?.(
            uri,
            node.attributes.alt || 'olusturulan-gorsel',
            mimeType,
            needsAuthorization ? authorization : undefined,
          )}
          style={{
            backgroundColor: '#0f172a',
            borderColor: isUser ? 'rgba(255,255,255,0.2)' : '#d1d5db',
            borderRadius: 8,
            borderWidth: 1,
            marginTop: 8,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          <Image
            source={imageSource}
            resizeMode="contain"
            style={{ height: 220, maxWidth: '100%', width: 260 }}
          />
        </Pressable>
      );
    },
  }), [apiOrigin, authorization, isUser, onImagePress]);

  return (
    <MarkdownStream
      colorScheme="dark"
      cursorColor={textColor}
      onLinkPress={(url) => {
        if (!onLinkPress) return false;
        onLinkPress(resolveMarkdownUri(url, apiOrigin));
        return true;
      }}
      rules={rules}
      streaming={isStreaming}
      style={isUser ? userStyles : assistantStyles}
    >
      {content}
    </MarkdownStream>
  );
}
