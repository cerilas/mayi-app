import { EncodingType, File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/json': 'json',
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/csv': 'csv',
  'text/plain': 'txt',
};

export function inferMimeType(fileName: string, fallback = 'application/octet-stream') {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? fallback;
}

export function fileNameFromUrl(url: string, fallback = 'dosya') {
  if (url.startsWith('data:')) return fallback;

  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : fallback;
  } catch {
    const name = url.split('?')[0].split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : fallback;
  }
}

export function isDownloadableUrl(url: string) {
  if (url.startsWith('data:')) return true;
  if (url.includes('/api/files/')) return true;
  return /\.(?:csv|gif|jpe?g|json|pdf|png|txt|webp|xlsx?|zip)(?:$|[?#])/i.test(url);
}

function safeFileName(fileName: string, mimeType: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'dosya';
  const hasExtension = /\.[a-z0-9]{1,8}$/i.test(cleaned);
  const extension = EXTENSION_BY_MIME[mimeType];
  return !hasExtension && extension ? `${cleaned}.${extension}` : cleaned;
}

async function downloadOnWeb(
  url: string,
  fileName: string,
  mimeType: string,
  authorization?: string,
) {
  let downloadUrl = url;
  let shouldRevoke = false;

  if (!url.startsWith('data:') && authorization) {
    const response = await fetch(url, {
      headers: { Authorization: authorization },
    });
    if (!response.ok) throw new Error(`Dosya indirilemedi (${response.status})`);
    downloadUrl = URL.createObjectURL(await response.blob());
    shouldRevoke = true;
  }

  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = safeFileName(fileName, mimeType);
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (shouldRevoke) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
}

export async function saveOrShareFile({
  url,
  fileName,
  mimeType,
  authorization,
}: {
  url: string;
  fileName: string;
  mimeType: string;
  authorization?: string;
}) {
  const finalName = safeFileName(fileName, mimeType);

  if (Platform.OS === 'web') {
    await downloadOnWeb(url, finalName, mimeType, authorization);
    return;
  }

  let localFile: ExpoFile;
  const dataMatch = url.match(/^data:([^;,]+);base64,([\s\S]+)$/);

  if (dataMatch) {
    const dataMimeType = dataMatch[1] || mimeType;
    localFile = new ExpoFile(
      Paths.cache,
      `${Date.now()}-${safeFileName(finalName, dataMimeType)}`,
    );
    localFile.write(dataMatch[2], { encoding: EncodingType.Base64 });
  } else {
    const destination = new ExpoFile(Paths.cache, `${Date.now()}-${finalName}`);
    localFile = await ExpoFile.downloadFileAsync(url, destination, {
      headers: authorization ? { Authorization: authorization } : undefined,
      idempotent: true,
    });
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localFile.uri, {
      dialogTitle: 'Dosyayı Kaydet veya Paylaş',
      mimeType,
    });
    return;
  }

  await Linking.openURL(localFile.uri);
}
