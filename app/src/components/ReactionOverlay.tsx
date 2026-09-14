import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ReactionItem } from '../types/sync';

interface Props {
  reactions: ReactionItem[];
  onSendReaction?: (emoji: string) => void;
}

const EMOJIS = ['❤️', '🔥', '👏', '😂', '🎉', '🤯'];

export const ReactionOverlay: React.FC<Props> = ({ reactions, onSendReaction }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Floating Active Reactions */}
      <View style={styles.floatingArea} pointerEvents="none">
        {reactions.slice(-6).map((reaction, index) => (
          <View key={reaction.id} style={[styles.floatingBubble, { bottom: 60 + index * 40, right: 20 + (index % 3) * 15 }]}>
            <Text style={styles.bubbleEmoji}>{reaction.emoji}</Text>
            {reaction.senderName && (
              <Text style={styles.bubbleSender}>{reaction.senderName}</Text>
            )}
          </View>
        ))}
      </View>

      {/* Emoji Picker Bar */}
      <View style={styles.pickerBar}>
        {EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.emojiButton}
            onPress={() => onSendReaction?.(emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingArea: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    width: 200,
    height: 300,
  },
  floatingBubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  bubbleEmoji: {
    fontSize: 22,
  },
  bubbleSender: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 6,
    fontWeight: '600',
  },
  pickerBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  emojiText: {
    fontSize: 22,
  },
});
