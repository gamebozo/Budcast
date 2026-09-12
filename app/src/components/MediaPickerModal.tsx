import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MediaItem } from '../types/sync';
import { X, Film, Music, Link2, Check, Sparkles, Upload, FileVideo, FileAudio, Mic } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getApiBaseUrl } from '../services/apiConfig';

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedId?: string;
  onSelect: (item: MediaItem) => void;
}

export const MediaPickerModal: React.FC<Props> = ({
  visible,
  onClose,
  selectedId,
  onSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['video/*', 'audio/*'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];
          const isVideo = asset.mimeType?.startsWith('video');

          // Instantly prepare media item
          const localItem: MediaItem = {
            id: 'local-' + Date.now(),
            title: asset.name.replace(/\.[^/.]+$/, ''),
            type: isVideo ? 'video' : 'audio',
            url: asset.uri,
            filename: asset.name,
            size: asset.size
          };

          setUploading(true);
          try {
            const formData = new FormData();
            formData.append('media', {
              uri: asset.uri,
              name: asset.name,
              type: asset.mimeType || (isVideo ? 'video/mp4' : 'audio/mp3')
            } as any);
            formData.append('title', asset.name.replace(/\.[^/.]+$/, ''));

            const response = await fetch(`${getApiBaseUrl()}/api/upload`, {
              method: 'POST',
              body: formData,
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = await response.json();
            if (data && data.url) {
              onSelect(data);
            } else {
              onSelect(localItem);
            }
          } catch (uploadErr) {
            onSelect(localItem);
          }
          onClose();
        }
      } catch (e) {
        console.error('Upload error:', e);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleWebFileChange = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data && data.url) {
        onSelect(data);
        onClose();
      } else {
        const localUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video');
        onSelect({
          id: 'local-' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: isVideo ? 'video' : 'audio',
          url: localUrl,
          filename: file.name,
          size: file.size
        });
        onClose();
      }
    } catch (e) {
      const localUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      onSelect({
        id: 'local-' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: isVideo ? 'video' : 'audio',
        url: localUrl,
        filename: file.name,
        size: file.size
      });
      onClose();
    } finally {
      setUploading(false);
    }
  };

  const handleApplyCustom = () => {
    if (!customUrl.trim()) return;
    const isVideo = customUrl.toLowerCase().includes('mp4') || !customUrl.toLowerCase().includes('mp3');
    onSelect({
      id: 'custom-' + Date.now(),
      title: customTitle.trim() || 'Custom Stream',
      type: isVideo ? 'video' : 'audio',
      url: customUrl.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Media from Device</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'upload' && styles.tabBtnActive]}
              onPress={() => setActiveTab('upload')}
            >
              <Upload size={15} color={activeTab === 'upload' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>Device Files</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'url' && styles.tabBtnActive]}
              onPress={() => setActiveTab('url')}
            >
              <Link2 size={15} color={activeTab === 'url' ? '#38BDF8' : '#94A3B8'} />
              <Text style={[styles.tabText, activeTab === 'url' && styles.tabTextActive]}>Direct Link</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listArea} showsVerticalScrollIndicator={false}>
            {activeTab === 'upload' && (
              <View style={styles.uploadContainer}>
                <View style={styles.iconCircle}>
                  <Upload size={32} color="#38BDF8" />
                </View>
                <Text style={styles.uploadPrompt}>Pick Video or Audio File</Text>
                <Text style={styles.uploadSub}>
                  Select any movie (MP4, MKV) or audio track (MP3, WAV, FLAC) from your device.
                </Text>

                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="video/*,audio/*"
                    onChange={handleWebFileChange}
                  />
                )}

                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={handlePickFile}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#090A0F" />
                  ) : (
                    <>
                      <Upload size={16} color="#090A0F" />
                      <Text style={styles.browseButtonText}>Browse Files</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'url' && (
              <View style={styles.customForm}>
                <Text style={styles.inputLabel}>Stream URL (MP4, HLS, or MP3)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/media.mp4"
                  placeholderTextColor="#64748B"
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Track / Movie Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Inception Live Watch"
                  placeholderTextColor="#64748B"
                  value={customTitle}
                  onChangeText={setCustomTitle}
                />

                <TouchableOpacity style={styles.submitBtn} onPress={handleApplyCustom}>
                  <Text style={styles.submitBtnText}>Load Custom Stream</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  listArea: {
    marginBottom: 10,
  },
  uploadContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadPrompt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  uploadSub: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 260,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  browseButtonText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '900',
  },
  customForm: {
    paddingVertical: 6,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: '#38BDF8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '800',
  },
});
