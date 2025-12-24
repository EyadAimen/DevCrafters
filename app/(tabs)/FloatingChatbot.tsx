import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SupabaseChatbot } from './SupabaseChatbot';

const { width, height } = Dimensions.get('window');

// Types
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

const FloatingChatbot: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      text: 'Hello! I\'m your intelligent pharmacy assistant. I can help with medication questions, refills, side effects, and more! How can I assist you today?', 
      sender: 'bot', 
      timestamp: new Date().toISOString() 
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingIntent, setTrainingIntent] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // DRAGGABLE STATE
  const [buttonPosition, setButtonPosition] = useState({ x: width - 80, y: height - 150 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  
  // Initialize chatbot (now with smart features)
  const [chatbot] = useState(() => new SupabaseChatbot());
  
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = buttonPosition.x + gestureState.dx;
        const newY = buttonPosition.y + gestureState.dy;
        
        const boundedX = Math.max(10, Math.min(width - 70, newX));
        const boundedY = Math.max(50, Math.min(height - 100, newY));
        
        setButtonPosition({ x: boundedX, y: boundedY });
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        AsyncStorage.setItem('chatbot_position', JSON.stringify(buttonPosition));
      },
    })
  );

  // Load saved position
  useEffect(() => {
    const loadPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem('chatbot_position');
        if (savedPosition) {
          setButtonPosition(JSON.parse(savedPosition));
        }
      } catch (error) {
        console.log('No saved position found');
      }
    };
    loadPosition();
  }, []);

  // Toggle chat
  const toggleChat = useCallback(() => {
    if (isDragging) return;
    
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    } else {
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    }
  }, [isVisible, slideAnim, isDragging]);

  // ==================== 3-STEP TRAINING FUNCTION ====================
  const startThreeStepTraining = useCallback(() => {
    // STEP 1: Ask for intent/category
    Alert.prompt(
      '🎓 Train Chatbot - Step 1/3',
      'Category/Intent name (e.g., "price", "greeting", "refill"):',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Next', 
          onPress: (intent: string | undefined) => {
            if (intent && intent.trim()) {
              const newIntent = intent.trim();
              setTrainingIntent(newIntent);
              
              // STEP 2: Ask for pattern (what users say)
              Alert.prompt(
                '🎓 Train Chatbot - Step 2/3',
                `For intent: "${newIntent}"\n\nWhat might users ask? (e.g., "what is the price", "how much does it cost"):`,
                [
                  { text: 'Back', onPress: () => startThreeStepTraining() },
                  { 
                    text: 'Next', 
                    onPress: (pattern: string | undefined) => {
                      if (pattern && pattern.trim()) {
                        const userPattern = pattern.trim();
                        
                        // STEP 3: Ask for response (what bot replies)
                        Alert.prompt(
                          '🎓 Train Chatbot - Step 3/3',
                          `For intent: "${newIntent}"\nWhen users ask: "${userPattern}"\n\nWhat should I reply?`,
                          [
                            { text: 'Back', onPress: () => startThreeStepTraining() },
                            { 
                              text: 'Complete Training', 
                              onPress: async (response: string | undefined) => {
                                if (response && response.trim()) {
                                  const botResponse = response.trim();
                                  
                                  // Start training
                                  setIsTraining(true);
                                  
                                  // Add training message
                                  setMessages(prev => [...prev, {
                                    id: Date.now().toString(),
                                    text: `⚙️ Training "${newIntent}" with pattern "${userPattern}"...`,
                                    sender: 'bot',
                                    timestamp: new Date().toISOString(),
                                  }]);
                                  
                                  // TRAIN THE SMART CHATBOT
                                  const success = await chatbot.train(newIntent, userPattern, botResponse);
                                  
                                  setIsTraining(false);
                                  
                                  // Show result
                                  if (success) {
                                    setMessages(prev => [...prev, {
                                      id: (Date.now() + 1).toString(),
                                      text: `✅ Successfully trained "${newIntent}"!\n\nNow when users ask about "${userPattern}" (or similar), I'll respond: "${botResponse}"\n\n✅ Saved to database for everyone!`,
                                      sender: 'bot',
                                      timestamp: new Date().toISOString(),
                                    }]);
                                    
                                    Alert.alert(
                                      '✅ Training Complete',
                                      `Intent: "${newIntent}"\nPattern: "${userPattern}"\nResponse: "${botResponse}"\n\n✅ Saved to database for all users!`,
                                      [{ text: 'OK' }]
                                    );
                                  } else {
                                    setMessages(prev => [...prev, {
                                      id: (Date.now() + 1).toString(),
                                      text: '❌ Training failed. Please try again.',
                                      sender: 'bot',
                                      timestamp: new Date().toISOString(),
                                    }]);
                                    
                                    Alert.alert('❌ Training Failed', 'Please try again.');
                                  }
                                  
                                  // Reset training state
                                  setTrainingIntent('');
                                }
                              }
                            }
                          ],
                          'plain-text'
                        );
                      }
                    }
                  }
                ],
                'plain-text'
              );
            }
          }
        }
      ],
      'plain-text'
    );
  }, [chatbot]);

  // ==================== START TRAINING (WITH PASSWORD) ====================
  const startTraining = useCallback(() => {
    // If not admin yet, ask for password
    if (!isAdmin) {
      Alert.prompt(
        '🔐 Admin Access',
        'Enter password to train chatbot:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enter', 
            onPress: async (password: string | undefined) => {
              if (password === "admin123") {
                setIsAdmin(true);
                // Start 3-step training
                startThreeStepTraining();
              } else {
                Alert.alert('❌ Wrong Password', 'Please try again.');
              }
            }
          }
        ],
        'secure-text'
      );
      return;
    }
    
    // If already admin, start 3-step training
    startThreeStepTraining();
  }, [isAdmin, startThreeStepTraining]);

  // ==================== EXIT ADMIN MODE ====================
  const exitAdminMode = useCallback(() => {
    Alert.alert(
      'Exit Admin Mode',
      'Are you sure you want to exit admin mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          onPress: () => {
            setIsAdmin(false);
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: '👤 Exited admin mode.',
              sender: 'bot',
              timestamp: new Date().toISOString(),
            }]);
          },
          style: 'destructive'
        }
      ]
    );
  }, []);

  // ==================== SYNC OFFLINE TRAINING TO DATABASE ====================
  const syncToDatabase = useCallback(async () => {
    Alert.alert(
      '🔄 Sync to Database',
      'Push all local training to Supabase database?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sync Now', 
          onPress: async () => {
            setIsTraining(true);
            
            // Add sync message
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              text: '🔄 Syncing local training to database...',
              sender: 'bot',
              timestamp: new Date().toISOString(),
            }]);
            
            const result = await chatbot.syncToSupabase();
            setIsTraining(false);
            
            // Show result
            Alert.alert(
              result.success ? '✅ Sync Complete' : '❌ Sync Failed',
              result.message,
              [{ text: 'OK' }]
            );
            
            // Add result to chat
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              text: result.message,
              sender: 'bot',
              timestamp: new Date().toISOString(),
            }]);
          }
        }
      ]
    );
  }, [chatbot]);

  // ==================== SEND MESSAGE ====================
  const sendMessage = useCallback(async () => {
    if (inputText.trim() === '') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(async () => {
      let response: string;
      
      // Get SMART response from chatbot
      response = await chatbot.getResponse(inputText);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 800);
  }, [inputText, chatbot]);

  // Animation value
  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  // Render message
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userMessage : styles.botMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.botMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.timestamp,
        item.sender === 'user' ? styles.userTimestamp : styles.botTimestamp
      ]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  ), []);

  return (
    <>
      {/* FLOATING BUTTON */}
      <View
        style={[
          styles.floatingButtonContainer,
          { left: buttonPosition.x, top: buttonPosition.y },
          isDragging && styles.draggingButton
        ]}
        {...panResponderRef.current.panHandlers}
      >
        <TouchableOpacity 
          style={[
            styles.buttonContent,
            isAdmin && styles.adminButton
          ]}
          onPress={toggleChat}
          activeOpacity={0.8}
          delayPressIn={50}
        >
          <Ionicons 
            name={isVisible ? "close" : "chatbubble"} 
            size={28} 
            color="white" 
          />
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield" size={12} color="white" />
            </View>
          )}
        </TouchableOpacity>
        
        {isDragging && (
          <View style={styles.dragIndicator}>
            <Text style={styles.dragText}>Drag me!</Text>
          </View>
        )}
      </View>

      {/* CHAT MODAL */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={toggleChat}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <Animated.View style={[
            styles.modalContainer,
            { transform: [{ translateY: modalTranslateY }] }
          ]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.chatContainer}
            >
              {/* HEADER */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>
                    {isAdmin ? '⚙️ Admin Mode' : '🧠 Smart Assistant'}
                  </Text>
                  {isAdmin && (
                    <View style={styles.adminLabel}>
                      <Text style={styles.adminLabelText}>ADMIN</Text>
                    </View>
                  )}
                  
                  {/* DATABASE STATUS */}
                  <View style={styles.databaseStatus}>
                    <Ionicons 
                      name={chatbot.isOnline ? "cloud" : "cloud-offline"} 
                      size={12} 
                      color={chatbot.isOnline ? "#4CAF50" : "#FF9800"} 
                    />
                    <Text style={styles.databaseStatusText}>
                      {chatbot.isOnline ? 'DB Online' : 'DB Offline'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.headerButtons}>
                  {/* SYNC BUTTON (only show when offline and admin) */}
                  {isAdmin && !chatbot.isOnline && (
                    <TouchableOpacity 
                      onPress={syncToDatabase}
                      style={styles.syncButton}
                    >
                      <Ionicons name="sync" size={18} color="#FF9800" />
                    </TouchableOpacity>
                  )}
                  
                  {/* EXIT ADMIN BUTTON */}
                  {isAdmin && (
                    <TouchableOpacity 
                      onPress={exitAdminMode}
                      style={styles.exitAdminButton}
                    >
                      <Ionicons name="exit-outline" size={20} color="#FF5252" />
                    </TouchableOpacity>
                  )}
                  
                  {/* SETTINGS/TRAINING BUTTON */}
                  <TouchableOpacity 
                    onPress={startTraining}
                    style={styles.settingsButton}
                  >
                    <Ionicons 
                      name="settings-outline" 
                      size={22} 
                      color={isAdmin ? "#4CAF50" : "#666"} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={toggleChat}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Training indicator */}
              {isTraining && (
                <View style={styles.trainingIndicator}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.trainingText}>
                    {trainingIntent 
                      ? `Training: "${trainingIntent}"` 
                      : chatbot.isOnline ? 'Saving to database...' : 'Saving locally...'
                    }
                  </Text>
                </View>
              )}

              {/* Messages */}
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              />

              {/* Typing indicator */}
              {isTyping && (
                <View style={styles.typingContainer}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              )}

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about medications, refills, side effects..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                  editable={!isTraining}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButton, 
                    (!inputText.trim() || isTyping || isTraining) && styles.sendButtonDisabled
                  ]} 
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isTyping || isTraining}
                >
                  <Ionicons 
                    name="send" 
                    size={22} 
                    color={(!inputText.trim() || isTyping || isTraining) ? '#ccc' : '#007AFF'} 
                  />
                </TouchableOpacity>
              </View>

              {/* Footer info */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {isAdmin 
                    ? `⚙️ Admin: ${chatbot.isOnline ? 'Saves to database' : 'Saving locally (offline)'}`
                    : '🧠 Intelligent assistant - Ask naturally about medications, refills, side effects, etc.'
                  }
                </Text>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // DRAGGABLE BUTTON
  floatingButtonContainer: {
    position: 'absolute',
    zIndex: 9999,
    alignItems: 'center',
  },
  draggingButton: {
    opacity: 0.9,
  },
  buttonContent: {
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  adminButton: {
    backgroundColor: '#4CAF50',
  },
  adminBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF9800',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    position: 'absolute',
    top: -30,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dragText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // MODAL
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  adminLabel: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adminLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  databaseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  databaseStatusText: {
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 3,
    color: '#666',
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  aiStatusText: {
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 3,
    color: '#2196F3',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncButton: {
    padding: 5,
  },
  exitAdminButton: {
    padding: 5,
  },
  settingsButton: {
    padding: 5,
  },
  
  // TRAINING INDICATOR
  trainingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  trainingText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  
  // MESSAGES
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#333333',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  userTimestamp: {
    color: '#E3F2FD',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#757575',
  },
  
  // TYPING INDICATOR
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // INPUT
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 48,
  },
  sendButton: {
    marginLeft: 12,
    padding: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  
  // FOOTER
  footer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default FloatingChatbot;