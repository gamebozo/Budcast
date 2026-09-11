import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  History, Users, Film, Headphones, ArrowLeft,
  RefreshCw, CheckCircle2, Clock, Smartphone, Radio,
  Sparkles, ExternalLink, ShieldCheck, Zap, Trash2, Download
} from 'lucide-react-native';
import { FloatingNavBar } from '../components/FloatingNavBar';
import { BudcastLogo } from '../components/BudcastLogo';
import { getHostId } from '../services/hostStorage';

interface ListenerRecord {
  id: number;
  room_id: string;
  socket_id: string;
  user_name: string;
  device: string;
  media_title: string;
  mode: string;
  channel: string;
  joined_at: string;
}

interface RoomRecord {
  id: string;
  title: string;
  mode: string;
  media_title: string;
  media_url: string;
  created_at: string;
  total_listeners: number;
}

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'listeners' | 'rooms'>('listeners');
  const [listeners, setListeners] = useState<ListenerRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistoryData = async () => {
    try {
      const hostId = getHostId();
      const [resListeners, resRooms] = await Promise.all([
        fetch(`http://localhost:4000/api/history/listeners?hostId=${encodeURIComponent(hostId)}`).then(r => r.json()).catch(() => []),
        fetch(`http://localhost:4000/api/history/rooms?hostId=${encodeURIComponent(hostId)}`).then(r => r.json()).catch(() => [])
      ]);

      if (Array.isArray(resListeners)) setListeners(resListeners);
      if (Array.isArray(resRooms)) setRooms(resRooms);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistoryData();
  };

  const handleClearHistory = async () => {
    try {
      setLoading(true);
      await fetch('http://localhost:4000/api/history/clear', { method: 'POST' });
      setListeners([]);
      setRooms([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (listeners.length === 0 && rooms.length === 0) return;
    const header = 'ID,Room PIN,User Name,Earbud Device,Mode,Channel,Media Title,Joined At\n';
    const rows = listeners.map(l => 
      `"${l.id}","${l.room_id}","${l.user_name}","${l.device}","${l.mode}","${l.channel}","${l.media_title}","${l.joined_at}"`
    ).join('\n');
    const csvContent = header + rows;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `budcast_attendance_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Recent';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#38BDF8" />
        }
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/' as any)}>
            <ArrowLeft size={16} color="#94A3B8" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BudcastLogo size={26} />
            {listeners.length > 0 && (
              <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV} activeOpacity={0.75}>
                <Download size={12} color="#10B981" />
                <Text style={styles.exportBtnText}>Export</Text>
              </TouchableOpacity>
            )}
            {(listeners.length > 0 || rooms.length > 0) && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearHistory} activeOpacity={0.75}>
                <Trash2 size={12} color="#EF4444" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <View style={styles.badge}>
              <History size={12} color="#38BDF8" />
              <Text style={styles.badgeText}>AUDIENCE LOGS</Text>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroBox}>
          <Text style={styles.heroTitle}>My Broadcast & Audience History</Text>
          <Text style={styles.heroDesc}>
            Real-time records of rooms you hosted, attendees who joined your sessions, and their connected earbud devices.
          </Text>

          {/* Stats Counters */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{listeners.length}</Text>
              <Text style={styles.statLabel}>My Total Attendees</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#A855F7' }]}>{rooms.length}</Text>
              <Text style={styles.statLabel}>Hosted Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>0.00ms</Text>
              <Text style={styles.statLabel}>Sync Phase Lock</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'listeners' && styles.tabBtnActive]}
            onPress={() => setActiveTab('listeners')}
          >
            <Users size={15} color={activeTab === 'listeners' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabBtnText, activeTab === 'listeners' && styles.tabBtnTextActive]}>
              My Attendees ({listeners.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'rooms' && styles.tabBtnActive]}
            onPress={() => setActiveTab('rooms')}
          >
            <Film size={15} color={activeTab === 'rooms' ? '#38BDF8' : '#94A3B8'} />
            <Text style={[styles.tabBtnText, activeTab === 'rooms' && styles.tabBtnTextActive]}>
              Hosted Rooms ({rooms.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Loading audience history...</Text>
          </View>
        ) : activeTab === 'listeners' ? (
          /* TAB 1: JOINED ATTENDEES & WHAT THEY ARE WATCHING / LISTENING TO */
          <View style={styles.section}>
            {listeners.length === 0 ? (
              <View style={styles.emptyCard}>
                <Users size={40} color="#64748B" />
                <Text style={styles.emptyTitle}>No Attendees Logged Yet</Text>
                <Text style={styles.emptyDesc}>
                  When users join any room via PIN or QR code, their device and what they are watching will appear here.
                </Text>
              </View>
            ) : (
              listeners.map((item, idx) => (
                <View key={item.id || idx} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Users size={16} color="#38BDF8" />
                      </View>
                      <View>
                        <Text style={styles.userName}>{item.user_name || 'Anonymous Guest'}</Text>
                        <View style={styles.deviceTagRow}>
                          <Smartphone size={10} color="#94A3B8" />
                          <Text style={styles.deviceText}>{item.device || 'Wireless Earbuds'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.roomPinBadge}>
                      <Text style={styles.roomPinText}>PIN #{item.room_id}</Text>
                    </View>
                  </View>

                  {/* What they watched / listened to */}
                  <View style={styles.mediaSeeingBox}>
                    <View style={styles.mediaSeeingHeader}>
                      {item.mode === 'video' ? (
                        <Film size={14} color="#38BDF8" />
                      ) : (
                        <Headphones size={14} color="#EF4444" />
                      )}
                      <Text style={styles.mediaSeeingLabel}>
                        {item.mode === 'video' ? 'WATCHING VIDEO / CINEMA' : 'LISTENING TO AUDIO / DISCO'}
                      </Text>
                    </View>
                    <Text style={styles.mediaSeeingTitle} numberOfLines={1}>
                      {item.media_title || 'Live Stream'}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.syncLockTag}>
                      <CheckCircle2 size={12} color="#10B981" />
                      <Text style={styles.syncLockText}>Earbuds Phase-Locked</Text>
                    </View>
                    <View style={styles.dateTag}>
                      <Clock size={11} color="#64748B" />
                      <Text style={styles.dateText}>{formatDate(item.joined_at)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          /* TAB 2: BROADCAST SESSIONS */
          <View style={styles.section}>
            {rooms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Film size={40} color="#64748B" />
                <Text style={styles.emptyTitle}>No Broadcast Sessions</Text>
                <Text style={styles.emptyDesc}>
                  Host a Cinema or Silent Disco session to see it logged here.
                </Text>
              </View>
            ) : (
              rooms.map((room) => (
                <View key={room.id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomTitle}>{room.title || 'Untitled Room'}</Text>
                      <Text style={styles.roomCode}>Room Code: <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>{room.id}</Text></Text>
                    </View>
                    <View style={[styles.modePill, room.mode === 'audio' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                      <Text style={[styles.modePillText, room.mode === 'audio' && { color: '#EF4444' }]}>
                        {room.mode === 'video' ? 'CINEMA' : 'SILENT DISCO'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.syncLockTag}>
                      <Users size={12} color="#38BDF8" />
                      <Text style={[styles.syncLockText, { color: '#CBD5E1' }]}>
                        {room.total_listeners || 0} Connected Listeners
                      </Text>
                    </View>
                    <View style={styles.dateTag}>
                      <Clock size={11} color="#64748B" />
                      <Text style={styles.dateText}>{formatDate(room.created_at)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Quick Refresh Button */}
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.8}>
          <RefreshCw size={15} color="#38BDF8" />
          <Text style={styles.refreshBtnText}>Refresh Audience History</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Persistent Bottom Bar */}
      <FloatingNavBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  exportBtnText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearBtnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroBox: {
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  statNumber: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  tabBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  section: {
    gap: 12,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyDesc: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
    maxWidth: 280,
  },
  historyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  deviceTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  deviceText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  roomPinBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roomPinText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  mediaSeeingBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  mediaSeeingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  mediaSeeingLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mediaSeeingTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  syncLockTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncLockText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#64748B',
    fontSize: 10,
  },
  roomTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  roomCode: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  modePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  modePillText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  refreshBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
});
