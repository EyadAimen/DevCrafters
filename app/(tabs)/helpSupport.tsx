import * as React from "react";
import {ScrollView, StyleSheet, Pressable, Text, View, Image, Dimensions} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const HelpSupport = () => {
  const [expandedFaqs, setExpandedFaqs] = React.useState<number[]>([]);
  
  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqItems = [
    {
      question: "How do I scan my medication?",
      answer: "Use the camera feature in the app to scan your medication barcode. Make sure you have good lighting and hold your phone steady."
    },
    {
      question: "How do I set up medication reminders?",
      answer: "Go to Medications tab > Add Medication > Set schedule. You can set multiple reminders per day and customize notification sounds."
    },
    {
      question: "Can I order refills through the app?",
      answer: "Yes, you can request prescription refills directly through the app. We'll contact your pharmacy on your behalf."
    },
    {
      question: "How do I add a payment method?",
      answer: "Go to Profile > Payment Methods > Add New. We accept credit/debit cards and digital wallets."
    },
    {
      question: "Is my medical data secure?",
      answer: "Yes, we use bank-level encryption and comply with HIPAA regulations. Your data is never shared without your consent."
    },
    {
      question: "What if I miss a dose?",
      answer: "The app will show missed doses in your history. You can log them manually and the app will adjust your adherence statistics."
    },
    {
      question: "Can I track multiple people's medications?",
      answer: "Yes, you can create separate profiles for family members under your main account in the Family section."
    },
    {
      question: "How do I find nearby pharmacies?",
      answer: "Use the Pharmacy Locator in the app, which shows pharmacies near you with hours, contact info, and directions."
    }
  ];

  const supportMethods = [
    {
      title: "Live Chat",
      description: "Chat with our support team",
      availability: "Available 9 AM - 6 PM MYT",
      icon: "chatbubbles" as const
    },
    {
      title: "Email Support",
      description: "support@pillora.my",
      availability: "Response within 24 hours",
      icon: "mail" as const
    },
    {
      title: "Phone Support",
      description: "+60 3-2123 4567",
      availability: "Mon-Fri, 9 AM - 6 PM MYT",
      icon: "call" as const
    }
  ];

  const helpResources = [
    {
      title: "User Guide",
      description: "Learn how to use Pillora",
      icon: "book" as const
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step guides",
      icon: "videocam" as const
    },
    {
      title: "Terms & Privacy",
      description: "Read our policies",
      icon: "shield-checkmark" as const
    },
    {
      title: "Report a Problem",
      description: "Report bugs or issues",
      icon: "bug" as const
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient 
        colors={['#f8fafc', 'rgba(239, 246, 255, 0.3)', 'rgba(236, 254, 255, 0.2)']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Help & Support</Text>
              <Text style={styles.subtitle}>We're here to help you</Text>
            </View>
          </View>

          {/* Contact Us Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            
            {supportMethods.map((method, index) => (
              <Pressable key={index} style={styles.card} onPress={() => {}}>
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name={method.icon} size={24} color="#0ea5e9" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{method.title}</Text>
                    <Text style={styles.cardDescription}>{method.description}</Text>
                    <Text style={styles.cardAvailability}>{method.availability}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>
              </Pressable>
            ))}
          </View>

          {/* Support Ticket Section */}
          <View style={styles.section}>
            <View style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Ionicons name="document-text" size={20} color="#0ea5e9" />
                <Text style={styles.sectionTitle}>Submit Support Ticket</Text>
              </View>
              
              <View style={styles.ticketForm}>
                <View style={styles.input}>
                  <Text style={styles.inputPlaceholder}>Subject</Text>
                </View>
                <View style={[styles.input, styles.textArea]}>
                  <Text style={styles.inputPlaceholder}>Describe your issue or question...</Text>
                </View>
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.submitButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Pressable onPress={() => {}}>
                    <Text style={styles.submitButtonText}>Submit Ticket</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            
            {faqItems.map((faq, index) => (
              <Pressable 
                key={index} 
                style={styles.faqItem}
                onPress={() => toggleFaq(index)}
              >
                <View style={styles.faqQuestion}>
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Ionicons 
                    name={expandedFaqs.includes(index) ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748b" 
                  />
                </View>
                {expandedFaqs.includes(index) && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Help Resources */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help Resources</Text>
            
            <View style={styles.resourcesGrid}>
              {helpResources.map((resource, index) => (
                <Pressable key={index} style={styles.resourceCard} onPress={() => {}}>
                  <View style={styles.resourceContent}>
                    <View style={styles.resourceIconContainer}>
                      <Ionicons name={resource.icon} size={24} color="#0ea5e9" />
                    </View>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Text style={styles.resourceDescription}>{resource.description}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Emergency Notice */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="warning" size={24} color="#ef4444" />
              <Text style={styles.emergencyTitle}>Medical Emergency</Text>
            </View>
            <Text style={styles.emergencyText}>
              This app is not for emergencies. Call 999 (Malaysia) or visit the nearest hospital immediately.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pillora Support Team • Available 24/7</Text>
          </View>
        </ScrollView>
        
        {/* Bottom Navigation */}
        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: 'Arimo-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Arimo-Regular',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Arimo-SemiBold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Arimo-SemiBold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Arimo-Regular',
    marginBottom: 2,
  },
  cardAvailability: {
    fontSize: 12,
    color: '#0ea5e9',
    fontFamily: 'Arimo-Regular',
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketForm: {
    gap: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputPlaceholder: {
    color: '#64748b',
    fontSize: 16,
    fontFamily: 'Arimo-Regular',
  },
  submitButton: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Arimo-SemiBold',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontFamily: 'Arimo-Regular',
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Arimo-Regular',
    lineHeight: 20,
  },
  resourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  resourceCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceContent: {
    alignItems: 'center',
  },
  resourceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Arimo-SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Arimo-Regular',
    textAlign: 'center',
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    fontFamily: 'Arimo-SemiBold',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Arimo-Regular',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Arimo-Regular',
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default HelpSupport;