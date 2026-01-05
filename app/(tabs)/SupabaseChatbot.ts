// SupabaseChatbot.ts - UPDATED VERSION WITH NEW FEATURES
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';


// Types
interface IntentData {
  patterns: string[];
  responses: string[];
}


interface ChatbotIntents {
  [key: string]: IntentData;
}


interface KeywordRule {
  keywords: string[];
  contextWords?: string[];
  response: string;
  category: string;
}


export class SupabaseChatbot {
  private localIntents: ChatbotIntents = {};
  public isOnline: boolean = true;
  private conversationHistory: string[] = [];
 
  // SMART KEYWORD DETECTION RULES
  private keywordRules: KeywordRule[] = [
    // NEW: APP FEATURES / WHAT DOES APP DO
    {
      keywords: ['what does this app do', 'app features', 'main features', 'purpose of this app', 'what is this app for', 'function of this app', 'how does this app help', 'what can this app do', 'tell me about this app'],
      response: `📱 **This app is designed to assist patients**, especially the elderly and those with chronic illnesses who often struggle to manage multiple medications, remember dosages, and refill prescriptions on time.


**🌟 Main Features:**
• 📸 **Image Recognition** - Scan medicine packaging to get accurate medicine details
• 💰 **Secure Payments** - Integrated with Stripe for safe refill payments
• 📍 **Pharmacy Locator** - Uses Google Maps API to find nearby pharmacies
• 🔔 **Smart Reminders** - Never forget to take your medicine
• 📊 **Analytics** - Track your medication adherence
• 🗑️ **Medicine Disposal** - Properly dispose of expired medicines
• 💊 **Medicine Database** - Detailed information about thousands of medications
• 📋 **Medicine List** - Keep track of all your medications in one place
• 🔄 **Easy Refills** - Request refills with just a few taps


**Perfect for:**
👴 Elderly patients
🩺 Chronic illness management
💊 Multiple medication users
🧠 Those who struggle with medication schedules


What specific feature would you like to know more about?`,
      category: 'app_features'
    },
    {
      keywords: ['this app', 'your app', 'application', 'software', 'platform'],
      contextWords: ['do', 'does', 'purpose', 'function', 'feature', 'help', 'assist', 'capabilities'],
      response: `📱 **This app helps you manage your medications effectively!**


Using **image recognition technology**, you can scan medicine packaging to get accurate medicine details. Integrated with **Stripe for secure payment** and **Google Maps API**, the app enables you to locate nearby pharmacies and order refills online.


**Key benefits:**
• Never forget to take your medicine with smart reminders
• Identify medicines quickly by scanning packaging
• Get detailed information about any medication
• Find nearby pharmacies easily
• Track your medication adherence over time
• Safely dispose of expired medicines


Which feature interests you the most?`,
      category: 'app_general'
    },


    // NEW: MEDICINE IDENTIFICATION / SCAN FEATURE
    {
      keywords: ['identify medicine', 'see medicine name', 'what medicine is this', 'scan medicine', 'medicine name', 'identify this medicine', 'what is this medicine', 'name of medicine'],
      response: `📸 **You can use the scan feature to identify medicine:**


1. Click on the **scan button** at the navigation bar
2. Choose **"Take Photo"** if you want to scan the medicine package directly
3. Or choose **"Upload"** if you want to upload a picture of the medicine package


The app will then:
• Identify the medicine name automatically
• Show you all the details about the medicine
• Give you the option to add it to your medicine list


This feature is especially helpful if you have poor eyesight or if the medicine label is hard to read. Would you like me to guide you through the scanning process step by step?`,
      category: 'medicine_identification'
    },
    {
      keywords: ['eyes not good', 'eyes are not good', 'cant see properly', 'poor eyesight', 'vision problem', 'hard to read', 'cant read label'],
      contextWords: ['medicine', 'medication', 'package', 'label'],
      response: `👁️ **I understand! When vision is poor, identifying medicine can be challenging.**


Here's how our app helps:
1. **Click the scan icon** from the navigation tab
2. **Take a photo** of the medicine package OR **upload** an existing photo
3. The app will **automatically detect and identify** the medicine name
4. It shows the **name and all details** of the medicine
5. You can choose to **add it to your medicine list** by clicking "Add to My Med"


No more squinting at tiny labels! The app does the reading for you. Would you like me to explain any step in more detail?`,
      category: 'vision_assistance'
    },


    // NEW: REMINDER FEATURE FOR FORGETFULNESS
    {
      keywords: ['forget to take medicine', 'keep forgetting', 'forgot my medicine', 'always forget', 'forgetful', 'dont remember', 'missed dose', 'missed medication'],
      response: `🔔 **Use the reminder feature to never forget your medicine again!**


**Here's how to set it up:**
1. Go to the **Reminder section** (Bell icon on the home page)
2. Click on **"Add New Reminder"**
3. Enter the **medicine name**
4. Set the **frequency** (how many times per day)
5. Set the **specific times** for each dose
6. Press **"Create Reminder"**


**When it's time to take medicine:**
• You'll get a **notification** on your phone
• Take your medicine as instructed
• **Don't forget to press the "Confirm" button** after taking it
• This records your adherence for tracking


**Benefits:**
✅ Never miss a dose
✅ Track your adherence over time
✅ Get insights into your medication habits
✅ Peace of mind knowing you're on track


Would you like help setting up a specific reminder?`,
      category: 'reminder_setup'
    },
    {
      keywords: ['remind me', 'set reminder', 'make sure i take', 'help me remember', 'wont forget', 'ensure i take'],
      contextWords: ['medicine', 'medication', 'pill', 'dose'],
      response: `⏰ **Perfect! Let me help you set up reminders:**


**To create a reminder:**
1. Click on the **reminder tab**
2. Choose the **time** for each dose
3. Select the **amount** of medicine per day
4. **Save the reminder**


**When the time comes:**
• A **notification will pop up**
• It will remind you to take your medicine
• After taking it, **click "I already took the medicine"**
• This confirms you've taken your dose


**Pro tips:**
• Set reminders 5 minutes before actual dose time
• Use different ringtones for different medicines
• Check your weekly adherence in the analytics section


Ready to set up your first reminder?`,
      category: 'reminder_details'
    },


    // NEW: MEDICINE DISPOSAL FOR EXPIRED MEDICINES
    {
      keywords: ['medicine expired', 'expired medicine', 'what to do with expired', 'dispose medicine', 'throw away medicine', 'old medicine', 'out of date'],
      response: `🗑️ **For expired medicines, use the disposal feature:**


**Here's what to do:**
1. Expired medicines **automatically appear** in the Medicine Disposal list (located in your Profile section)
2. Click on **"Disposal List"**
3. Then click **"View Guide"**


**You'll see two options:**
📍 **Find Nearby Drop-Off Sites** - Shows all pharmacies that allow legal disposal of expired medicine
📋 **Basic Home Disposal Steps** - Guides you through proper home disposal


**To use the guide:**
1. Click **"View Detailed Guide"**
2. Follow the **step-by-step instructions**
3. Click each instruction **as you complete it**
4. Finally, click **"Mark as Disposed"**


**⚠️ Important: Never flush medicines down the toilet or throw in regular trash unless instructed!**


Need help finding a disposal site near you?`,
      category: 'medicine_disposal'
    },
    {
      keywords: ['dispose', 'disposal', 'throw out', 'get rid of', 'discard'],
      contextWords: ['medicine', 'medication', 'expired', 'old', 'unused'],
      response: `⚠️ **Proper medicine disposal is important for safety and environment!**


**In the app:**
1. Go to **Profile section**
2. Click **"Disposal List"** (expired medicines appear here automatically)
3. Tap **"View Guide"** for disposal instructions


**The guide provides:**
• **Nearby pharmacy drop-off locations** (using Google Maps)
• **Step-by-step home disposal instructions**
• **Safety precautions** to follow
• **Environmental guidelines**


**Remember:**
✅ Dispose at authorized locations when possible
✅ Follow specific disposal instructions for each medicine type
✅ Never share or reuse expired medicines
✅ Keep medicines away from children and pets


Would you like me to explain the disposal process in more detail?`,
      category: 'disposal_instructions'
    },


    // ... (KEEP ALL YOUR EXISTING RULES HERE - they should remain as is)
    // MEDICATION REFILL DETECTION
    {
      keywords: ['running low', 'getting low', 'almost empty', 'nearly out', 'low supply', 'low on', 'almost out', 'finishing soon', 'last few', 'need more', 'out of', 'no more'],
      contextWords: ['medicine', 'medication', 'pill', 'tablet', 'prescription', 'drug', 'pills', 'tablets'],
      response: "📋 Your medication is running low? Please go to the **Refill Feature** and select your pharmacy for a refill request. You should request refills 3-5 days before running out completely. Would you like me to guide you through the refill process?",
      category: 'medication_refill'
    },
   
    // ... (REST OF YOUR EXISTING RULES CONTINUE HERE)
    // Make sure all your existing rules from the original code are included here


    // MEDICINE INFORMATION QUERIES
    {
      keywords: ['side effect', 'side effects', 'adverse effect', 'reaction'],
      contextWords: ['medicine', 'medication', 'drug', 'pill', 'tablet', 'capsule', 'injection'],
      response: "🤔 I can check side effects for you! Please tell me the **name of the medicine** you're asking about. For example: 'side effects of paracetamol' or 'what are the side effects of ibuprofen?'",
      category: 'medicine_side_effects_ask'
    },


    // ... (CONTINUE WITH ALL YOUR OTHER EXISTING RULES)
   
    // Your exact rules from the previous code for:
    // - medicine_side_effects_lookup
    // - medicine_dosage_ask
    // - medicine_purpose_ask
    // - medicine_interactions_ask
    // - medicine_warnings_ask
    // - side_effects
    // - pricing
    // - interactions
    // - dosage
    // - pharmacy_location
    // - prescription_status
    // - reminder_exact
    // - identification_exact
    // - analytics_exact
    // - medlist_exact
    // - refill_exact
  ];


  constructor() {
    this.loadLocalIntents();
    this.checkConnection();
  }


  // ... (KEEP ALL EXISTING METHODS EXACTLY AS THEY ARE)
  // The rest of your class methods remain unchanged
  private async checkConnection() {
    try {
      const { error } = await supabase
        .from('chatbot_intents')
        .select('id')
        .limit(1);
     
      this.isOnline = !error;
      console.log(`📡 Database connection: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error: any) {
      this.isOnline = false;
      console.log('⚠️ Offline mode - will sync later');
    }
  }


  private async loadLocalIntents() {
    try {
      const saved = await AsyncStorage.getItem('chatbot_intents');
      this.localIntents = saved ? JSON.parse(saved) : this.getDefaultIntents();
    } catch (error) {
      this.localIntents = this.getDefaultIntents();
    }
  }


  private getDefaultIntents(): ChatbotIntents {
    return {
      greeting: {
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        responses: ['Hello! 👋 How can I help you with your medications today?', 'Hi there! I\'m your pharmacy assistant. What can I help you with?', 'Hey! Need help with prescriptions, refills, or medication questions?']
      },
      goodbye: {
        patterns: ['bye', 'goodbye', 'see you', 'thanks bye', 'thank you bye'],
        responses: ['Goodbye! 👋 Stay healthy!', 'See you! Remember to take your medications on time.', 'Bye! Contact me anytime for medication assistance.']
      },
      thanks: {
        patterns: ['thank you', 'thanks', 'appreciate', 'helpful'],
        responses: ['You\'re welcome! 😊 Happy to help with your medication needs.', 'Glad I could help! Let me know if you have more questions.', 'Anytime! Stay healthy!']
      },
      // Add new default intents for the new features
      app_features: {
        patterns: ['what does this app do', 'features of the app', 'tell me about this app'],
        responses: ['📱 This app helps manage medications with features like medicine scanning, reminders, refills, and disposal guides. Need details on any specific feature?']
      },
      medicine_identification: {
        patterns: ['how to identify medicine', 'scan medicine', 'find medicine name'],
        responses: ['📸 Use the scan feature! Click the scan button, take a photo of the medicine package, and the app will identify it for you.']
      }
    };
  }


  // ... (KEEP ALL OTHER EXISTING METHODS EXACTLY AS THEY ARE)
  // The medicine database lookup, extractMedicineName, detectSmartKeywords,
  // fuzzyMatch, train, saveLocal, syncToSupabase, getResponse, and learnFromInteraction
  // methods should remain exactly as they were in your original code


  // ========== MEDICINE DATABASE LOOKUP ==========
  async getMedicineInfo(medicineName: string): Promise<string | null> {
    if (!this.isOnline) {
      console.log('⚠️ Cannot check medicine database: Offline');
      return null;
    }
   
    try {
      console.log(`🔍 Looking up medicine: ${medicineName}`);
     
      // Search by medicine name or generic name
      const { data, error } = await supabase
        .from('medicine_reference')
        .select('*')
        .or(`medicine_name.ilike.%${medicineName}%,generic_name.ilike.%${medicineName}%`)
        .limit(1);


      if (error) {
        console.error('❌ Medicine query error:', error.message);
        return null;
      }


      if (data && data.length > 0) {
        const medicine = data[0];
        console.log(`✅ Found medicine: ${medicine.medicine_name}`);
        return this.formatMedicineResponse(medicine);
      }
     
      console.log(`❌ Medicine not found: ${medicineName}`);
      return null;
    } catch (error: any) {
      console.error('Medicine lookup failed:', error.message);
      return null;
    }
  }


  private formatMedicineResponse(medicine: any): string {
    const response = `
💊 **${medicine.medicine_name}** (${medicine.generic_name})


**Purpose:**
${medicine.purpose}


**How to Take:**
${medicine.how_to_take}


**Common Side Effects:**
${medicine.common_side_effects}


**⚠️ Serious Side Effects (Seek Medical Help):**
${medicine.serious_side_effects}


**🚨 Warnings:**
${medicine.warnings}


**💊 Drug Interactions:**
${medicine.drug_interactions || 'No significant interactions noted'}


**💊 Dosage:** ${medicine.dosage}
**🏭 Manufacturer:** ${medicine.manufacturer}
**📁 Category:** ${medicine.category}
**📦 Storage:** ${medicine.storage}


_This information is for educational purposes only. Always consult your doctor or pharmacist for medical advice._`;


    return response;
  }


  // ========== EXTRACT MEDICINE NAME FROM QUERY ==========
  private extractMedicineName(input: string): string | null {
    const medicinePatterns = [
      /side effect of (\w+)/i,
      /side effect for (\w+)/i,
      /effects of (\w+)/i,
      /how to take (\w+)/i,
      /dosage of (\w+)/i,
      /dose of (\w+)/i,
      /what is (\w+)/i,
      /what does (\w+) do/i,
      /purpose of (\w+)/i,
      /(\w+) side effects/i,
      /(\w+) dosage/i,
      /(\w+) how to take/i,
      /interactions of (\w+)/i,
      /(\w+) interactions/i,
      /warnings for (\w+)/i,
      /(\w+) warnings/i,
      /information about (\w+)/i,
      /tell me about (\w+)/i,
      /about (\w+)/i,
      /details of (\w+)/i,
      /medicine (\w+)/i,
      /drug (\w+)/i,
      /medication (\w+)/i
    ];
   
    for (const pattern of medicinePatterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const medicineName = match[1].toLowerCase();
        console.log(`💊 Extracted medicine name: "${medicineName}" from "${input}"`);
        return medicineName;
      }
    }
   
    // Check if input is just a medicine name
    const commonMedicines = [
      'paracetamol', 'panadol', 'prednisolone', 'ventolin', 'amoxil', 'lisinopril',
      'ibuprofen', 'nexium', 'ciplox', 'zyrtec', 'lipitor', 'omeprazole',
      'diclofenac', 'flagyl', 'glucophage', 'augmentin', 'norvasc', 'synthroid',
      'lasix', 'claritin', 'amaryl', 'acetaminophen', 'salbutamol', 'amoxicillin',
      'esomeprazole', 'ciprofloxacin', 'cetirizine', 'atorvastatin', 'furosemide',
      'loratadine', 'metformin', 'amlodipine', 'levothyroxine', 'glimepiride'
    ];
   
    const lowerInput = input.toLowerCase();
    for (const med of commonMedicines) {
      if (lowerInput.includes(med)) {
        console.log(`💊 Recognized medicine name: "${med}" in "${input}"`);
        return med;
      }
    }
   
    return null;
  }


  // ========== SMART KEYWORD DETECTION ==========
  private detectSmartKeywords(input: string): string | null {
    const lowerInput = input.toLowerCase();
   
    // Store matches with scores
    const matches: { rule: KeywordRule; score: number }[] = [];
   
    for (const rule of this.keywordRules) {
      let score = 0;
     
      // Check for keywords
      for (const keyword of rule.keywords) {
        if (lowerInput.includes(keyword)) {
          score += 2; // Base score for keyword match
         
          // Bonus for exact phrase match
          if (lowerInput.includes(` ${keyword} `) ||
              lowerInput.startsWith(keyword) ||
              lowerInput.endsWith(keyword)) {
            score += 1;
          }
        }
      }
     
      // Check for context words (if specified)
      if (rule.contextWords && rule.contextWords.length > 0) {
        const hasContext = rule.contextWords.some(context => lowerInput.includes(context));
        if (hasContext) {
          score += 1; // Bonus for context
        }
      }
     
      // Add to matches if score is sufficient
      if (score >= 2) {
        matches.push({ rule, score });
      }
    }
   
    // Return the highest scoring match
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      const bestMatch = matches[0];
     
      console.log(`✅ Smart detection: "${bestMatch.rule.category}" with score ${bestMatch.score}`);
     
      // Add some variety to responses
      const responses = [
        bestMatch.rule.response,
        `${bestMatch.rule.response}\n\nIs there anything else I can help you with?`,
        `${bestMatch.rule.response}\n\nWould you like more information about this?`
      ];
     
      return responses[Math.floor(Math.random() * responses.length)];
    }
   
    return null;
  }


  // ========== FUZZY MATCHING ==========
  private fuzzyMatch(input: string, pattern: string): boolean {
    const inputWords = input.toLowerCase().split(/\s+/);
    const patternWords = pattern.toLowerCase().split(/\s+/);
   
    // Check if at least 60% of pattern words are in input
    const matches = patternWords.filter(word => {
      // Skip very short common words
      if (word.length < 3) return true;
     
      return inputWords.some(inputWord =>
        inputWord.includes(word) || word.includes(inputWord)
      );
    });
   
    return matches.length / patternWords.length >= 0.6;
  }


  // ========== MAIN TRAINING METHOD ==========
  async train(intentName: string, pattern: string, response: string, userId?: string): Promise<boolean> {
    console.log(`🎯 Training: "${intentName}" | Pattern: "${pattern}" | Response: "${response}"`);
   
    const cleanIntent = intentName.toLowerCase().trim();
    const cleanPattern = pattern.toLowerCase().trim();
    const cleanResponse = response.trim();
   
    if (!cleanIntent || !cleanPattern || !cleanResponse) {
      console.log('❌ Training failed: Missing fields');
      return false;
    }


    let supabaseSuccess = false;
    let localSuccess = false;


    // ====== STEP 1: SAVE TO SUPABASE DATABASE ======
    if (this.isOnline) {
      try {
        console.log('💾 Saving to Supabase database...');
       
        // Check if intent already exists
        const { data: existingIntent, error: fetchError } = await supabase
          .from('chatbot_intents')
          .select('*')
          .eq('intent_name', cleanIntent)
          .maybeSingle();


        if (fetchError) {
          console.error('❌ Error checking existing intent:', fetchError.message || fetchError);
        }


        if (existingIntent) {
          // UPDATE existing intent
          console.log(`📝 Updating existing intent: ${cleanIntent}`);
         
          // Merge patterns
          const existingPatterns = existingIntent.patterns || [];
          const updatedPatterns = Array.from(
            new Set([...existingPatterns, cleanPattern])
          );
         
          // Merge responses
          const existingResponses = existingIntent.responses || [];
          const updatedResponses = Array.from(
            new Set([...existingResponses, cleanResponse])
          );


          // Update in Supabase
          const { error: updateError } = await supabase
            .from('chatbot_intents')
            .update({
              patterns: updatedPatterns,
              responses: updatedResponses,
              trained_at: new Date().toISOString(),
              trained_by: userId || existingIntent.trained_by
            })
            .eq('id', existingIntent.id);


          if (updateError) {
            console.error('❌ Supabase update error:', updateError.message || updateError);
          } else {
            supabaseSuccess = true;
            console.log(`✅ Updated in Supabase: ${cleanIntent}`);
          }
        } else {
          // INSERT new intent
          console.log(`🆕 Creating new intent in Supabase: ${cleanIntent}`);
         
          const { error: insertError } = await supabase
            .from('chatbot_intents')
            .insert({
              intent_name: cleanIntent,
              patterns: [cleanPattern],
              responses: [cleanResponse],
              trained_by: userId,
              is_active: true,
              created_at: new Date().toISOString(),
              trained_at: new Date().toISOString()
            });


          if (insertError) {
            console.error('❌ Supabase insert error:', insertError.message || insertError);
          } else {
            supabaseSuccess = true;
            console.log(`✅ Created in Supabase: ${cleanIntent}`);
          }
        }
      } catch (error: any) {
        console.error('❌ Supabase operation failed:', error.message || error);
        this.isOnline = false;
      }
    } else {
      console.log('⚠️ Cannot save to Supabase: Offline');
    }


    // ====== STEP 2: SAVE LOCALLY ======
    try {
      console.log('📱 Saving locally as backup...');
      localSuccess = await this.saveLocal(cleanIntent, cleanPattern, cleanResponse);
      if (localSuccess) {
        console.log(`✅ Saved locally: ${cleanIntent}`);
      }
    } catch (error: any) {
      console.error('❌ Local save error:', error.message || error);
    }


    // ====== RETURN RESULT ======
    if (supabaseSuccess) {
      console.log(`🎉 Training complete! Saved to database for everyone.`);
      return true;
    } else if (localSuccess) {
      console.log(`💾 Training saved locally only (database offline). Will sync later.`);
      return true;
    } else {
      console.log('❌ Training failed completely');
      return false;
    }
  }


  private async saveLocal(intentName: string, pattern: string, response: string): Promise<boolean> {
    try {
      if (!this.localIntents[intentName]) {
        this.localIntents[intentName] = { patterns: [], responses: [] };
      }
     
      if (!this.localIntents[intentName].patterns.includes(pattern)) {
        this.localIntents[intentName].patterns.push(pattern);
      }
     
      if (!this.localIntents[intentName].responses.includes(response)) {
        this.localIntents[intentName].responses.push(response);
      }
     
      await AsyncStorage.setItem('chatbot_intents', JSON.stringify(this.localIntents));
      return true;
    } catch (error: any) {
      console.error('Local save error:', error.message || error);
      return false;
    }
  }


  // ========== SYNC METHOD ==========
  async syncToSupabase(userId?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Syncing local intents to Supabase...');
     
      if (!this.isOnline) {
        await this.checkConnection();
        if (!this.isOnline) {
          return { success: false, message: '❌ Cannot sync: No internet connection' };
        }
      }


      let syncedCount = 0;
      let errorCount = 0;


      // Sync each local intent to Supabase
      for (const [intentName, intentData] of Object.entries(this.localIntents)) {
        try {
          // Check if intent exists in Supabase
          const { data: existingIntent } = await supabase
            .from('chatbot_intents')
            .select('*')
            .eq('intent_name', intentName)
            .maybeSingle();


          if (existingIntent) {
            // Merge and update
            const mergedPatterns = Array.from(
              new Set([...(existingIntent.patterns || []), ...intentData.patterns])
            );
            const mergedResponses = Array.from(
              new Set([...(existingIntent.responses || []), ...intentData.responses])
            );


            const { error: updateError } = await supabase
              .from('chatbot_intents')
              .update({
                patterns: mergedPatterns,
                responses: mergedResponses,
                trained_at: new Date().toISOString()
              })
              .eq('id', existingIntent.id);


            if (updateError) throw updateError;
          } else {
            // Create new intent
            const { error: insertError } = await supabase
              .from('chatbot_intents')
              .insert({
                intent_name: intentName,
                patterns: intentData.patterns,
                responses: intentData.responses,
                trained_by: userId,
                is_active: true
              });


            if (insertError) throw insertError;
          }
         
          syncedCount++;
          console.log(`✅ Synced intent: ${intentName}`);
        } catch (error: any) {
          errorCount++;
          console.error(`❌ Failed to sync intent ${intentName}:`, error.message || error);
        }
      }


      return {
        success: errorCount === 0,
        message: `🔄 Sync complete: ${syncedCount} intents synced, ${errorCount} errors`
      };
    } catch (error: any) {
      console.error('Sync failed:', error.message || error);
      return { success: false, message: `❌ Sync failed: ${error.message || 'Unknown error'}` };
    }
  }


  // ========== SMART GET RESPONSE ==========
  async getResponse(userInput: string): Promise<string> {
    const input = userInput.toLowerCase().trim();
   
    if (!input) return "Please type something!";
   
    // Add to conversation history (keep last 10 messages)
    this.conversationHistory.push(`User: ${input}`);
    if (this.conversationHistory.length > 10) {
      this.conversationHistory.shift();
    }
   
    // Check emergency keywords (highest priority)
    const emergencyKeywords = ['emergency', 'urgent', '911', 'heart attack', 'stroke', 'chest pain', 'bleeding', 'overdose', 'cant breathe', 'difficulty breathing'];
    if (emergencyKeywords.some(keyword => input.includes(keyword))) {
      return "🚨 **EMERGENCY ALERT**: Call 911 or emergency services immediately! This is a medical emergency. Do not wait. If someone is unconscious, having chest pain, difficulty breathing, or severe bleeding, call emergency services NOW!";
    }
   
    // ====== MEDICINE DATABASE LOOKUP ======
    const medicineName = this.extractMedicineName(input);
    if (medicineName) {
      const medicineInfo = await this.getMedicineInfo(medicineName);
      if (medicineInfo) {
        return medicineInfo;
      } else {
        // If medicine not found, try to help user phrase the query better
        if (input.includes('side effect') || input.includes('side effects')) {
          return `❌ I couldn't find "${medicineName}" in our medicine database. Please check the spelling or try asking about another medication. You can ask about: paracetamol, ibuprofen, amoxicillin, metformin, etc.`;
        }
      }
    }
   
    // ====== SMART KEYWORD DETECTION ======
    const smartResponse = this.detectSmartKeywords(input);
    if (smartResponse) {
      // Learn from this interaction
      await this.learnFromInteraction(input, smartResponse);
      return smartResponse;
    }
   
    // ====== TRY SUPABASE DATABASE ======
    if (this.isOnline) {
      try {
        const { data: intents, error } = await supabase
          .from('chatbot_intents')
          .select('*')
          .eq('is_active', true);


        if (!error && intents && intents.length > 0) {
          for (const intent of intents) {
            const patterns = intent.patterns || [];
            const responses = intent.responses || [];
           
            // Check each pattern with fuzzy matching
            for (const pattern of patterns) {
              if (this.fuzzyMatch(input, pattern)) {
                console.log(`✅ Database fuzzy match: "${pattern}" in "${input}"`);
               
                // Save to local for faster access next time
                await this.saveLocal(intent.intent_name, pattern, responses[0]);
               
                // Return random response with contextual follow-up
                const randomIndex = Math.floor(Math.random() * responses.length);
                return `${responses[randomIndex]}\n\nIs there anything else about this I can help clarify?`;
              }
            }
          }
        }
      } catch (error: any) {
        console.log('⚠️ Database fetch failed:', error.message || error);
        this.isOnline = false;
      }
    }
   
    // ====== FALLBACK TO LOCAL STORAGE ======
    for (const [intentName, intent] of Object.entries(this.localIntents)) {
      for (const pattern of intent.patterns) {
        if (this.fuzzyMatch(input, pattern)) {
          console.log(`✅ Local fuzzy match: "${pattern}" in "${input}"`);
          const responses = intent.responses;
          if (responses.length > 0) {
            return responses[Math.floor(Math.random() * responses.length)];
          }
        }
      }
    }
   
    // ====== CONTEXT-AWARE FALLBACK ======
    // Check if user is asking about medications generally
    if (input.includes('medicine') || input.includes('medication') || input.includes('pill') || input.includes('prescription') || input.includes('drug')) {
      return `💊 I can help with medication questions! Try asking specifically:
• "What are the side effects of [medicine name]?"
• "How to take [medicine name]?"
• "What is [medicine name] for?"
• "Interactions of [medicine name]"


Examples: "side effects of ibuprofen", "how to take metformin", "what is lisinopril"`;
    }
   
    // Check if user might be asking about app features
    if (input.includes('app') || input.includes('feature') || input.includes('function') || input.includes('do')) {
      return `📱 This app helps you manage medications with features like:
• 📸 Scan medicine packages for identification
• 🔔 Set reminders so you never forget doses
• 📍 Find nearby pharmacies
• 💊 Get detailed medicine information
• 🗑️ Dispose expired medicines properly
• 🔄 Easy prescription refills


What would you like to know more about?`;
    }
   
    // ====== GENERAL HELPFUL RESPONSE ======
    const helpfulResponses = [
      "I'm here to help with medication-related questions! You can ask about:\n• Medicine side effects\n• How to take medications\n• Drug interactions\n• Refill requests\n• Pharmacy locations\n• App features\n\nTry: 'What does this app do?' or 'How to identify medicine?'",
      "I specialize in pharmacy and medication assistance. Try asking about:\n• 'What are the app features?'\n• 'How to scan medicine?'\n• 'Set up medication reminders'\n• 'Dispose expired medicine'\n• 'Medicine side effects'\n\nOr ask about a specific medicine like ibuprofen or metformin.",
      "I want to help you with your medication needs! Could you be more specific? For example:\n📱 'What does this app do?'\n📸 'How to identify medicine?'\n🔔 'I keep forgetting my medicine'\n🗑️ 'My medicine expired'\n💊 'Side effects of [medicine]'\n📍 'Find a pharmacy'"
    ];
   
    return helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];
  }


  // ========== LEARN FROM INTERACTIONS ==========
  private async learnFromInteraction(userInput: string, botResponse: string): Promise<void> {
    try {
      // Extract potential intent from the interaction
      const categories = ['refill', 'side effect', 'price', 'interaction', 'dosage', 'pharmacy', 'prescription', 'medicine', 'app', 'feature', 'scan', 'identify', 'reminder', 'forget', 'dispose', 'expired'];
      const matchedCategory = categories.find(category =>
        userInput.includes(category) || botResponse.includes(category)
      );
     
      if (matchedCategory) {
        // Save to local learning
        if (!this.localIntents[matchedCategory]) {
          this.localIntents[matchedCategory] = { patterns: [], responses: [] };
        }
       
        // Add pattern if not already there
        if (!this.localIntents[matchedCategory].patterns.includes(userInput)) {
          this.localIntents[matchedCategory].patterns.push(userInput);
        }
       
        // Add response if not already there
        if (!this.localIntents[matchedCategory].responses.includes(botResponse)) {
          this.localIntents[matchedCategory].responses.push(botResponse);
        }
       
        // Save to AsyncStorage
        await AsyncStorage.setItem('chatbot_intents', JSON.stringify(this.localIntents));
        console.log(`🧠 Learned from interaction: ${matchedCategory}`);
      }
    } catch (error) {
      console.log('Could not learn from interaction:', error);
    }
  }
}

