import React, { useMemo } from 'react';
import { Image, Platform, Pressable, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import {
  MarkdownStream,
  type MarkdownStyleMap,
  type RenderRules,
} from '@ronradtke/react-native-markdown-display';
import { MapPin, Navigation, Phone, Play } from 'lucide-react-native';
import { CLINIC_MAP_URL, formatTelHref } from '../constants/clinic';

interface MarkdownMessageProps {
  apiOrigin?: string;
  authorization?: string;
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
  onImagePress?: (uri: string, fileName: string, mimeType: string, authorization?: string) => void;
  onLinkPress?: (url: string) => void;
  accentColor?: string;
  accentLight?: string;
}

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

type BlockLink = { kind: 'map' | 'tel' | 'youtube'; label: string; url: string };
type Segment = { type: 'markdown'; text: string } | { type: 'block'; link: BlockLink };

function blockKind(url: string): BlockLink['kind'] | null {
  if (url === CLINIC_MAP_URL) return 'map';
  if (url.startsWith('tel:')) return 'tel';
  if (YOUTUBE_ID_RE.test(url)) return 'youtube';
  return null;
}

/** Markdown links render inside <Text>, so card-style links are lifted out as standalone blocks. */
function splitBlockLinks(text: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const kind = blockKind(match[2]);
    if (!kind) continue;
    const before = text.slice(cursor, match.index).trim();
    if (before) segments.push({ type: 'markdown', text: before });
    segments.push({ type: 'block', link: { kind, label: match[1], url: match[2] } });
    cursor = match.index! + match[0].length;
  }
  const rest = text.slice(cursor).trim();
  if (rest) segments.push({ type: 'markdown', text: rest });
  return segments;
}

function ActionCard({ icon, iconBg, title, subtitle, trailing, onPress, label }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  trailing: React.ReactNode;
  onPress?: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} accessibilityRole="link" accessibilityLabel={label} style={mapCardStyles.card}>
      <View style={[mapCardStyles.pin, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={mapCardStyles.texts}>
        <Text numberOfLines={1} style={mapCardStyles.title}>{title}</Text>
        <Text numberOfLines={1} style={mapCardStyles.subtitle}>{subtitle}</Text>
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

function VideoCard({ label, url, onPress }: { label: string; url: string; onPress?: () => void }) {
  const id = url.match(YOUTUBE_ID_RE)?.[1];
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label} videosunu aç`} style={mapCardStyles.video}>
      <View style={mapCardStyles.videoThumb}>
        {id && <Image source={{ uri: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        <View style={mapCardStyles.playButton}>
          <Play color="#ffffff" fill="#ffffff" size={18} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 12, paddingVertical: 9 }}>
        <Text numberOfLines={1} style={mapCardStyles.title}>{label || 'Video'}</Text>
        <Text numberOfLines={1} style={mapCardStyles.subtitle}>YouTube'da izle</Text>
      </View>
    </TouchableOpacity>
  );
}

const mapCardStyles = StyleSheet.create({
  video: {
    alignSelf: 'stretch',
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  videoThumb: { height: 150, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  callBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#ecfdf5' },
  callBadgeText: { color: '#047857', fontSize: 13, fontWeight: '700' },
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pin: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  title: { color: '#111827', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  subtitle: { color: '#6b7280', fontSize: 12, lineHeight: 16, marginTop: 2 },
  arrow: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

function BlockLinkCard({ link, accentColor, accentLight, onPress }: { link: BlockLink; accentColor: string; accentLight: string; onPress?: () => void }) {
  if (link.kind === 'youtube') return <VideoCard label={link.label} url={link.url} onPress={onPress} />;
  if (link.kind === 'tel') {
    return (
      <ActionCard
        label={`${link.label} numarasını ara`}
        onPress={onPress}
        iconBg="#059669"
        icon={<Phone color="#ffffff" size={19} />}
        title={link.label}
        subtitle={formatTelHref(link.url)}
        trailing={<View style={mapCardStyles.callBadge}><Text style={mapCardStyles.callBadgeText}>Ara</Text></View>}
      />
    );
  }
  return (
    <ActionCard
      label="Kliniğin konumunu Google Haritalar'da aç"
      onPress={onPress}
      iconBg={accentColor}
      icon={<MapPin color="#ffffff" size={20} />}
      title="Haritada Aç"
      subtitle="Google Haritalar'da yol tarifi"
      trailing={<View style={[mapCardStyles.arrow, { backgroundColor: accentLight }]}><Navigation color={accentColor} size={16} /></View>}
    />
  );
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
  accentColor = '#2563eb',
  accentLight = '#eff6ff',
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
    link: (node, children, parentNodes, styles) => {
      const rawUri = node.attributes.href;
      if (!rawUri) return null;
      const uri = resolveMarkdownUri(rawUri, apiOrigin);

      // Check if YouTube link
      const ytMatch = uri.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        const ytId = ytMatch[1];
        const thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        
        return (
          <Pressable
            key={node.key}
            onPress={() => {
              if (onLinkPress) onLinkPress(uri);
            }}
            style={{
              marginVertical: 10,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#1e293b',
              borderWidth: 1,
              borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              maxWidth: 300,
            }}
          >
            <View style={{ height: 160, width: '100%', position: 'relative' }}>
              <Image source={{ uri: thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 20, marginLeft: 4 }}>▶</Text>
                </View>
              </View>
            </View>
            <View style={{ padding: 10, backgroundColor: isUser ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }}>
              <Text style={{ color: isUser ? '#fff' : '#1e293b', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                YouTube Video
              </Text>
              <Text style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#64748b', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                {uri}
              </Text>
            </View>
          </Pressable>
        );
      }

      // Default Link
      return (
        <Text
          key={node.key}
          style={styles.link}
          onPress={() => {
            if (onLinkPress) onLinkPress(uri);
          }}
        >
          {children}
        </Text>
      );
    }
  }), [apiOrigin, authorization, isUser, onImagePress, onLinkPress]);

  const processedContent = useMemo(() => {
    let text = content || '';
    // Linkify raw URLs that are not already markdown links
    text = text.replace(/(^|\s)(https?:\/\/[^\s<>"]+?)(?=[.,;!?]?(\s|$))/g, "$1[$2]($2)");
    return text;
  }, [content]);

  const segments = useMemo<Segment[]>(
    () => (isUser ? [{ type: 'markdown', text: processedContent }] : splitBlockLinks(processedContent)),
    [isUser, processedContent],
  );

  const renderMarkdown = (text: string, streaming: boolean) => (
    <MarkdownStream
      colorScheme="dark"
      cursorColor={textColor}
      onLinkPress={(url) => {
        if (!onLinkPress) return false;
        onLinkPress(resolveMarkdownUri(url, apiOrigin));
        return true;
      }}
      rules={rules}
      streaming={streaming}
      style={isUser ? userStyles : assistantStyles}
    >
      {text}
    </MarkdownStream>
  );

  if (!segments.some((s) => s.type === 'block')) return renderMarkdown(processedContent, isStreaming);

  return (
    <View style={{ alignSelf: 'stretch' }}>
      {segments.map((segment, index) => (
        segment.type === 'block' ? (
          <BlockLinkCard
            key={index}
            link={segment.link}
            accentColor={accentColor}
            accentLight={accentLight}
            onPress={() => onLinkPress?.(segment.link.url)}
          />
        ) : (
          <React.Fragment key={index}>
            {renderMarkdown(segment.text, isStreaming && index === segments.length - 1)}
          </React.Fragment>
        )
      ))}
    </View>
  );
}
