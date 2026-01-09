import type { CognitiveAnalysis } from '../db/database';

// Claude API configuration - direct browser access enabled
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929';
const ANTHROPIC_VERSION = '2023-06-01';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text' | 'thinking';
    text?: string;
    thinking?: string;
  }>;
}

// Helper function to call Claude API
async function callClaudeAPI(
  messages: ClaudeMessage[],
  systemPrompt: string,
  apiKey: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    enableThinking?: boolean;
    thinkingBudget?: number;
  } = {}
): Promise<string> {
  const {
    maxTokens = 1024,
    temperature = 0.7,
    enableThinking = false,
    thinkingBudget = 5000,
  } = options;

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages,
  };

  // Only add temperature if not using thinking (they're incompatible)
  if (!enableThinking) {
    body.temperature = temperature;
  }

  // Add extended thinking if enabled
  if (enableThinking) {
    body.thinking = {
      type: 'enabled',
      budget_tokens: thinkingBudget,
    };
  }

  console.log('Claude API request:', {
    url: CLAUDE_API_URL,
    model: body.model,
    hasThinking: !!body.thinking,
    maxTokens: body.max_tokens,
    messageCount: messages.length,
  });

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Claude API error:', response.status, JSON.stringify(errorData, null, 2));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data: ClaudeResponse = await response.json();
  console.log('Claude API response content types:', data.content.map(c => c.type));

  // Extract text from response (skip thinking blocks)
  const textContent = data.content.find(c => c.type === 'text');
  if (!textContent?.text) {
    console.error('No text content in response:', JSON.stringify(data, null, 2));
    throw new Error('Empty response from Claude');
  }

  return textContent.text;
}

// Crisis detection and resources
export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'immediate';
  matchedPatterns: string[];
}

export const CRISIS_RESOURCES = {
  international: [
    { name: 'International Association for Suicide Prevention', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
  ],
  hotlines: [
    { country: 'US', name: 'National Suicide Prevention Lifeline', number: '988', available: '24/7' },
    { country: 'US', name: 'Crisis Text Line', number: 'Text HOME to 741741', available: '24/7' },
    { country: 'UK', name: 'Samaritans', number: '116 123', available: '24/7' },
    { country: 'Canada', name: 'Crisis Services Canada', number: '1-833-456-4566', available: '24/7' },
    { country: 'Australia', name: 'Lifeline', number: '13 11 14', available: '24/7' },
    { country: 'India', name: 'iCall', number: '9152987821', available: 'Mon-Sat 8am-10pm' },
    { country: 'Pakistan', name: 'Umang Helpline', number: '0311-7786264', available: '24/7' },
  ],
};

// Crisis detection patterns - ordered by severity
const CRISIS_PATTERNS = {
  immediate: [
    /\b(going to|want to|planning to|will) (kill|end|hurt) (myself|my life)\b/i,
    /\b(suicide|suicidal)\b/i,
    /\bkill myself\b/i,
    /\bend (it all|my life|everything)\b/i,
    /\bdon'?t want to (live|be alive|exist)\b/i,
    /\b(better off|world would be better) (dead|without me)\b/i,
    /\bno (reason|point) (to|in) (live|living|go on|going on)\b/i,
    /\bcan'?t (go on|take it|do this) anymore\b/i,
  ],
  high: [
    /\b(want to|wanna) (die|disappear)\b/i,
    /\bwish (i was|i were|i'd) (dead|never born|gone)\b/i,
    /\b(hurt|harm|cut|injure) myself\b/i,
    /\bself[- ]?harm\b/i,
    /\blife (is|isn'?t|not) worth (it|living)\b/i,
    /\beveryone would be (better|happier) without me\b/i,
    /\bi'?m a burden\b/i,
  ],
  medium: [
    /\bfeeling (hopeless|helpless|trapped)\b/i,
    /\bno (hope|way out)\b/i,
    /\bcan'?t (cope|handle|deal)\b/i,
    /\b(completely|utterly|totally) (alone|worthless|useless)\b/i,
    /\bwhat'?s the point\b/i,
    /\bgive up\b/i,
  ],
};

export function detectCrisis(transcript: string): CrisisDetectionResult {
  const matchedPatterns: string[] = [];
  let severity: CrisisDetectionResult['severity'] = 'none';

  // Check immediate severity first
  for (const pattern of CRISIS_PATTERNS.immediate) {
    if (pattern.test(transcript)) {
      matchedPatterns.push(pattern.source);
      severity = 'immediate';
    }
  }

  // Check high severity
  if (severity !== 'immediate') {
    for (const pattern of CRISIS_PATTERNS.high) {
      if (pattern.test(transcript)) {
        matchedPatterns.push(pattern.source);
        severity = 'high';
      }
    }
  }

  // Check medium severity
  if (severity === 'none') {
    for (const pattern of CRISIS_PATTERNS.medium) {
      if (pattern.test(transcript)) {
        matchedPatterns.push(pattern.source);
        severity = 'medium';
      }
    }
  }

  return {
    isCrisis: severity !== 'none',
    severity,
    matchedPatterns,
  };
}

// Types for extracted items
export interface ExtractedItems {
  tasks: ExtractedTask[];
  urges: ExtractedUrge[];
}

export interface ExtractedTask {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ExtractedUrge {
  urge: string;
  intensity: number;
  context?: string;
}

const COGNITIVE_DISTORTIONS = [
  {
    type: 'All-or-Nothing Thinking',
    patterns: ['always', 'never', 'completely', 'totally', 'nothing', 'everything', 'everyone', 'no one'],
    description: 'Seeing things in black-and-white categories with no middle ground',
  },
  {
    type: 'Catastrophizing',
    patterns: ['worst', 'terrible', 'awful', 'horrible', 'disaster', 'ruined', 'end of', 'can\'t handle', 'unbearable'],
    description: 'Expecting the worst possible outcome',
  },
  {
    type: 'Mind Reading',
    patterns: ['they think', 'everyone thinks', 'people think', 'they hate', 'they don\'t like', 'judging me', 'looking at me'],
    description: 'Assuming you know what others are thinking without evidence',
  },
  {
    type: 'Fortune Telling',
    patterns: ['will fail', 'won\'t work', 'going to', 'will never', 'won\'t ever', 'bound to', 'definitely will'],
    description: 'Predicting negative outcomes without evidence',
  },
  {
    type: 'Should Statements',
    patterns: ['should', 'shouldn\'t', 'must', 'have to', 'ought to', 'supposed to'],
    description: 'Rigid rules about how things should be',
  },
  {
    type: 'Labeling',
    patterns: ['i am a', 'i\'m such a', 'i\'m so', 'what a', 'loser', 'failure', 'idiot', 'stupid', 'worthless'],
    description: 'Attaching a negative label to yourself or others',
  },
  {
    type: 'Emotional Reasoning',
    patterns: ['i feel like', 'feels like', 'feel that', 'because i feel'],
    description: 'Believing something is true because you feel it strongly',
  },
  {
    type: 'Personalization',
    patterns: ['my fault', 'because of me', 'i caused', 'i made', 'blame myself', 'i\'m responsible for'],
    description: 'Taking responsibility for things outside your control',
  },
  {
    type: 'Discounting the Positive',
    patterns: ['doesn\'t count', 'anyone could', 'just luck', 'but', 'yeah but', 'that doesn\'t matter'],
    description: 'Dismissing positive experiences or accomplishments',
  },
  {
    type: 'Overgeneralization',
    patterns: ['this always happens', 'every time', 'nothing ever', 'i always', 'i never'],
    description: 'Drawing broad conclusions from a single event',
  },
];

const COGNITIVE_ANALYSIS_PROMPT = `You are a compassionate cognitive behavioral therapy assistant. Analyze the user's thoughts for cognitive distortions and provide helpful feedback.

CRITICAL SAFETY INSTRUCTION:
If the user expresses ANY thoughts of suicide, self-harm, wanting to die, or feeling like they can't go on:
1. Your overallAssessment MUST prioritize their safety first
2. Acknowledge their pain with empathy (e.g., "I hear that you're in a lot of pain right now")
3. Explicitly encourage them to reach out for professional support
4. Mention crisis resources: "Please reach out to a crisis helpline - in the US call 988, or text HOME to 741741"
5. DO NOT minimize their feelings or just treat it as a "cognitive distortion"
6. Remind them that these feelings can pass and help is available

Common cognitive distortions include:
- All-or-Nothing Thinking: Seeing things in black-and-white
- Catastrophizing: Expecting the worst outcome
- Mind Reading: Assuming you know what others think
- Fortune Telling: Predicting negative futures
- Should Statements: Rigid rules about how things should be
- Labeling: Attaching negative labels to self/others
- Emotional Reasoning: Believing feelings are facts
- Personalization: Taking blame for things outside your control
- Discounting the Positive: Dismissing good things
- Overgeneralization: Drawing broad conclusions from single events

Respond with JSON in this exact format:
{
  "distortions": [
    {"type": "Distortion Name", "quote": "exact quote from text", "explanation": "why this is a distortion"}
  ],
  "realityChecks": ["question to challenge the thought"],
  "reframes": ["alternative way to think about it"],
  "overallAssessment": "compassionate summary and encouragement",
  "coachAdvice": {
    "immediateAction": "One specific thing to do RIGHT NOW (e.g., 'Take 3 deep breaths', 'Step away from your desk for 2 minutes')",
    "shortTermSteps": ["2-3 concrete actionable steps to take today or this week"],
    "copingStrategy": "A specific coping technique relevant to their situation (grounding, breathing, journaling, etc.)",
    "affirmation": "A personalized, encouraging statement based on what they shared"
  }
}`;

export async function analyzeThoughts(transcript: string, apiKey: string): Promise<CognitiveAnalysis> {
  if (!apiKey) {
    // Fallback to pattern-based analysis if no API key
    return patternBasedAnalysis(transcript);
  }

  try {
    const content = await callClaudeAPI(
      [{ role: 'user', content: `Please analyze these thoughts for cognitive distortions and help me see things more clearly:\n\n"${transcript}"` }],
      COGNITIVE_ANALYSIS_PROMPT,
      apiKey,
      { maxTokens: 2048, temperature: 0.7 }
    );

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('AI analysis failed, using pattern-based analysis:', error);
    return patternBasedAnalysis(transcript);
  }
}

function patternBasedAnalysis(transcript: string): CognitiveAnalysis {
  const foundDistortions: CognitiveAnalysis['distortions'] = [];
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());

  for (const distortion of COGNITIVE_DISTORTIONS) {
    for (const pattern of distortion.patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      for (const sentence of sentences) {
        if (regex.test(sentence.toLowerCase())) {
          // Check if we haven't already found this type
          if (!foundDistortions.find(d => d.type === distortion.type && d.quote === sentence.trim())) {
            foundDistortions.push({
              type: distortion.type,
              quote: sentence.trim(),
              explanation: distortion.description,
            });
          }
          break;
        }
      }
    }
  }

  // Generate reality checks based on found distortions
  const realityChecks: string[] = [];
  const reframes: string[] = [];

  for (const distortion of foundDistortions) {
    switch (distortion.type) {
      case 'All-or-Nothing Thinking':
        realityChecks.push('Is there a middle ground or gray area here?');
        reframes.push('Consider: "Sometimes" or "In this situation" instead of absolutes');
        break;
      case 'Catastrophizing':
        realityChecks.push('What is the most likely outcome, not the worst?');
        reframes.push('Even if this happens, what could I do to cope?');
        break;
      case 'Mind Reading':
        realityChecks.push('What evidence do I actually have about what they\'re thinking?');
        reframes.push('I can\'t know for sure what others think without asking');
        break;
      case 'Fortune Telling':
        realityChecks.push('Have my predictions been accurate in the past?');
        reframes.push('The future is uncertain - many outcomes are possible');
        break;
      case 'Should Statements':
        realityChecks.push('Says who? Where does this rule come from?');
        reframes.push('Try "I would prefer" or "It would be nice if" instead');
        break;
      case 'Labeling':
        realityChecks.push('Am I defining myself by one action or characteristic?');
        reframes.push('I am more than any single label - I have many qualities');
        break;
      case 'Emotional Reasoning':
        realityChecks.push('Just because I feel this way, does that make it true?');
        reframes.push('My feelings are valid but they don\'t always reflect reality');
        break;
      case 'Personalization':
        realityChecks.push('What other factors might have contributed to this?');
        reframes.push('Many things are outside my control, and that\'s okay');
        break;
      case 'Discounting the Positive':
        realityChecks.push('Would I dismiss this accomplishment if a friend did it?');
        reframes.push('This positive thing is real and worth acknowledging');
        break;
      case 'Overgeneralization':
        realityChecks.push('Is this truly always the case, or just sometimes?');
        reframes.push('This is one instance, not a universal pattern');
        break;
    }
  }

  // Remove duplicates
  const uniqueRealityChecks = [...new Set(realityChecks)];
  const uniqueReframes = [...new Set(reframes)];

  const overallAssessment = foundDistortions.length === 0
    ? 'Your thoughts appear balanced. Continue practicing self-awareness and be kind to yourself.'
    : `I noticed ${foundDistortions.length} potential cognitive pattern(s) in your thoughts. Remember, noticing these patterns is the first step to changing them. You're doing great by taking time to examine your thinking.`;

  // Generate coach's advice based on detected distortions
  const coachAdvice = generateCoachAdvice(foundDistortions, transcript);

  return {
    distortions: foundDistortions.slice(0, 5), // Limit to top 5
    realityChecks: uniqueRealityChecks.slice(0, 4),
    reframes: uniqueReframes.slice(0, 4),
    overallAssessment,
    coachAdvice,
  };
}

// Generate coach's advice based on detected patterns
function generateCoachAdvice(distortions: CognitiveAnalysis['distortions'], transcript: string): CognitiveAnalysis['coachAdvice'] {
  const lowerTranscript = transcript.toLowerCase();

  // Determine immediate action based on emotional intensity
  let immediateAction = 'Take 3 slow, deep breaths right now. Inhale for 4 counts, hold for 4, exhale for 4.';

  if (lowerTranscript.includes('anxious') || lowerTranscript.includes('worried') || lowerTranscript.includes('stress')) {
    immediateAction = 'Ground yourself: Name 5 things you can see right now. This brings you back to the present moment.';
  } else if (lowerTranscript.includes('angry') || lowerTranscript.includes('frustrated') || lowerTranscript.includes('mad')) {
    immediateAction = 'Step away from the situation for 2 minutes. Splash cold water on your face or step outside briefly.';
  } else if (lowerTranscript.includes('sad') || lowerTranscript.includes('down') || lowerTranscript.includes('depressed')) {
    immediateAction = 'Change your physical state: Stand up, stretch your arms above your head, and take 3 deep breaths.';
  } else if (lowerTranscript.includes('overwhelm')) {
    immediateAction = 'Write down ONE thing you can control right now, no matter how small. Focus only on that.';
  }

  // Generate short-term steps based on distortion types
  const shortTermSteps: string[] = [];
  const distortionTypes = distortions.map(d => d.type);

  if (distortionTypes.includes('All-or-Nothing Thinking')) {
    shortTermSteps.push('Write down 3 examples of "gray areas" in this situation - things that aren\'t completely good or bad');
  }
  if (distortionTypes.includes('Catastrophizing')) {
    shortTermSteps.push('List 3 times you expected the worst but things turned out okay');
  }
  if (distortionTypes.includes('Mind Reading')) {
    shortTermSteps.push('Choose one person you\'re assuming things about and ask them directly how they feel');
  }
  if (distortionTypes.includes('Should Statements')) {
    shortTermSteps.push('Replace one "should" in your thinking with "I would like to" and notice how it feels');
  }
  if (distortionTypes.includes('Labeling')) {
    shortTermSteps.push('Write down 5 positive qualities about yourself that contradict the negative label');
  }

  // Add general steps if we don't have enough
  if (shortTermSteps.length < 2) {
    shortTermSteps.push('Journal for 5 minutes about what triggered these thoughts');
    shortTermSteps.push('Share these thoughts with someone you trust - a friend, family member, or therapist');
    shortTermSteps.push('Do one small act of self-care today: a walk, your favorite tea, or 10 minutes of rest');
  }

  // Determine coping strategy
  let copingStrategy = 'Try box breathing: Breathe in for 4 seconds, hold for 4 seconds, breathe out for 4 seconds, hold for 4 seconds. Repeat 4 times.';

  if (distortionTypes.includes('Catastrophizing') || distortionTypes.includes('Fortune Telling')) {
    copingStrategy = 'Practice the "Best/Worst/Most Likely" technique: Write down the best possible outcome, worst possible outcome, and most realistic outcome for your situation.';
  } else if (distortionTypes.includes('Mind Reading') || distortionTypes.includes('Personalization')) {
    copingStrategy = 'Use the "Evidence For/Against" technique: Make two columns and list actual evidence that supports and contradicts your assumptions.';
  } else if (distortionTypes.includes('Emotional Reasoning')) {
    copingStrategy = 'Try the "Name It to Tame It" technique: Simply label your emotion out loud ("I\'m feeling anxious") to reduce its intensity.';
  }

  // Generate personalized affirmation
  const affirmations = [
    'You showed courage by examining your thoughts. That self-awareness is a powerful tool for growth.',
    'Your feelings are valid, and so is your ability to work through them. You\'ve handled difficult things before.',
    'Taking time to reflect on your thinking shows strength. You\'re building mental fitness with each practice.',
    'You are more resilient than you realize. This moment of reflection is proof of that.',
    'Progress isn\'t always linear, but you\'re moving forward by being here and doing this work.',
  ];
  const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

  return {
    immediateAction,
    shortTermSteps: shortTermSteps.slice(0, 3),
    copingStrategy,
    affirmation,
  };
}

// Extract tasks and urges from voice transcript using AI
const EXTRACTION_PROMPT = `You are an assistant that extracts actionable tasks and impulses/urges from a person's stream of consciousness.

Extract:
1. TASKS: Things the person mentions needing to do, wants to do, or should do
2. URGES: Impulsive desires, cravings, or urges they mention (especially things they might regret, like shopping, eating, saying something harsh, etc.)

Respond with JSON in this exact format:
{
  "tasks": [
    {"title": "short task title", "description": "optional details", "priority": "high|medium|low"}
  ],
  "urges": [
    {"urge": "what they want to do impulsively", "intensity": 1-10, "context": "why they feel this urge"}
  ]
}

Only include items that are clearly mentioned. If none found, return empty arrays.`;

export async function extractTasksAndUrges(transcript: string, apiKey: string): Promise<ExtractedItems> {
  if (!apiKey) {
    return patternBasedExtraction(transcript);
  }

  try {
    const content = await callClaudeAPI(
      [{ role: 'user', content: `Extract tasks and urges from this transcript:\n\n"${transcript}"` }],
      EXTRACTION_PROMPT,
      apiKey,
      { maxTokens: 1024, temperature: 0.3 }
    );

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('AI extraction failed, using pattern-based extraction:', error);
    return patternBasedExtraction(transcript);
  }
}

function patternBasedExtraction(transcript: string): ExtractedItems {
  const tasks: ExtractedTask[] = [];
  const urges: ExtractedUrge[] = [];
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());

  // Task patterns
  const taskPatterns = [
    /i need to (.+)/i,
    /i have to (.+)/i,
    /i should (.+)/i,
    /i must (.+)/i,
    /i('ve)? got to (.+)/i,
    /i want to (.+)/i,
    /i('m| am) going to (.+)/i,
    /remind me to (.+)/i,
    /don't forget to (.+)/i,
    /todo:?\s*(.+)/i,
    /task:?\s*(.+)/i,
  ];

  // Urge patterns
  const urgePatterns = [
    { pattern: /i (really )?want to (buy|purchase|order|shop)(.+)?/i, intensity: 7 },
    { pattern: /i feel like (eating|binging|snacking)(.+)?/i, intensity: 6 },
    { pattern: /i('m| am) (so )?tempted to (.+)/i, intensity: 7 },
    { pattern: /i (just )?want to (yell|scream|shout|hit|punch)(.+)?/i, intensity: 8 },
    { pattern: /i feel like (quitting|giving up|stopping)(.+)?/i, intensity: 6 },
    { pattern: /i('m| am) craving (.+)/i, intensity: 7 },
    { pattern: /i can't (resist|stop|help) (.+)/i, intensity: 8 },
    { pattern: /i (really )?need to (check|scroll|browse) (social media|instagram|twitter|tiktok|facebook|reddit)(.+)?/i, intensity: 5 },
    { pattern: /i want to (text|call|message) (.+) (even though|but)/i, intensity: 6 },
  ];

  for (const sentence of sentences) {
    // Check for tasks
    for (const pattern of taskPatterns) {
      const match = sentence.match(pattern);
      if (match) {
        const taskText = match[match.length - 1]?.trim();
        if (taskText && taskText.length > 3 && taskText.length < 100) {
          // Avoid duplicates
          if (!tasks.find(t => t.title.toLowerCase() === taskText.toLowerCase())) {
            tasks.push({
              title: taskText.charAt(0).toUpperCase() + taskText.slice(1),
              priority: sentence.toLowerCase().includes('urgent') || sentence.toLowerCase().includes('asap') ? 'high' : 'medium',
            });
          }
        }
        break;
      }
    }

    // Check for urges
    for (const { pattern, intensity } of urgePatterns) {
      if (pattern.test(sentence)) {
        urges.push({
          urge: sentence.trim(),
          intensity,
          context: 'Detected from voice input',
        });
        break;
      }
    }
  }

  return {
    tasks: tasks.slice(0, 10),
    urges: urges.slice(0, 5),
  };
}

// Coach chat conversation
export interface CoachChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const COACH_SYSTEM_PROMPT = `You are a warm, empathetic cognitive coach named "Coach" within the NeuroLogic Coach app. Your role is to have supportive conversations with users to help them work through emotional challenges, cognitive distortions, and difficult situations.

CORE PRINCIPLES:
1. EMPATHY FIRST: Always acknowledge and validate the user's feelings before offering guidance
2. CURIOSITY: Ask thoughtful questions to help users explore their thoughts and feelings
3. COLLABORATIVE: Work WITH the user, not AT them. They are the expert on their own experience
4. ACTIONABLE: Guide toward concrete, achievable next steps
5. NON-JUDGMENTAL: Accept all feelings as valid while gently challenging unhelpful thought patterns

CONVERSATION APPROACH:
- Start by understanding: "Tell me more about..." or "What's making you feel that way?"
- Reflect back what you hear: "It sounds like you're feeling..."
- Explore gently: "What thoughts come up when...?" or "How does that affect you?"
- Challenge softly: "I wonder if there might be another way to look at this..."
- Empower: "What do you think might help?" before offering suggestions
- Summarize progress: "It seems like we've discovered..."

WHEN USER SEEMS STUCK:
- Offer specific coping techniques (breathing, grounding, cognitive reframes)
- Suggest small, immediate actions they can take
- Remind them of their strengths and past successes

CRISIS SAFETY (CRITICAL):
If the user expresses suicidal thoughts, self-harm, or severe distress:
1. Acknowledge their pain with deep empathy
2. Express genuine concern for their safety
3. Strongly encourage reaching out to crisis support: "I care about you and want you to be safe. Please reach out to a crisis line - in the US call 988 or text HOME to 741741"
4. Do NOT try to "fix" them - prioritize connection and professional help referral

ENDING A SESSION:
When the user feels better or finds resolution:
- Celebrate their progress
- Summarize key insights from the conversation
- Suggest one thing they can do to maintain the positive shift
- Let them know you're here whenever they need support

Keep responses SHORT and conversational (1-2 paragraphs, 3-5 sentences max). Be warm but concise. Ask ONE follow-up question. No lectures, no bullet points unless specifically helpful.`;

// Fallback responses when API is unavailable
function getCoachFallbackResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Check for crisis - always prioritize safety
  const crisisCheck = detectCrisis(userMessage);
  if (crisisCheck.isCrisis) {
    return `I hear that you're going through something really difficult right now. Your feelings are valid, and I'm concerned about your wellbeing.

Please know that you don't have to face this alone. I strongly encourage you to reach out to a crisis helpline:
- In the US: Call or text 988 (Suicide & Crisis Lifeline)
- Crisis Text Line: Text HOME to 741741
- International: findahelpline.com

These are free, confidential services available 24/7 with trained counselors who can help.

Is there anything immediate I can help you think through while you consider reaching out?`;
  }

  // Empathetic responses based on common themes
  if (lowerMessage.includes('anxious') || lowerMessage.includes('anxiety') || lowerMessage.includes('worried')) {
    return `It sounds like you're experiencing some anxiety right now, and that can feel really overwhelming. Thank you for sharing that with me.

A few things that might help in this moment:
• Try taking three slow, deep breaths - in for 4 counts, hold for 4, out for 4
• Ground yourself by naming 5 things you can see around you
• Remember: anxiety is temporary, even when it doesn't feel that way

What do you think is contributing most to these anxious feelings?`;
  }

  if (lowerMessage.includes('overwhelm') || lowerMessage.includes('too much') || lowerMessage.includes('can\'t cope')) {
    return `Feeling overwhelmed is so exhausting, and it's completely understandable to feel that way. You're dealing with a lot.

When everything feels like too much, it can help to:
• Focus on just the next small step, not everything at once
• Give yourself permission to let some things wait
• Take a brief pause - even 5 minutes can help reset

What feels like the heaviest thing on your mind right now?`;
  }

  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depressed')) {
    return `I'm sorry you're feeling down. Those feelings are valid, and it takes courage to acknowledge them.

Some gentle suggestions:
• Be kind to yourself - you're doing the best you can
• Small acts of self-care can help, even just getting some water or fresh air
• Connection helps - is there someone you trust you could reach out to?

Would you like to tell me more about what's been weighing on you?`;
  }

  if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated') || lowerMessage.includes('mad')) {
    return `It sounds like you're feeling some strong frustration or anger. Those emotions are valid - they're often telling us something important.

A few thoughts:
• It's okay to feel angry - the key is how we respond to it
• Sometimes writing out our frustrations can help process them
• Physical movement can help release some of that tension

What's at the core of what's frustrating you?`;
  }

  if (lowerMessage.includes('tired') || lowerMessage.includes('exhausted') || lowerMessage.includes('no energy')) {
    return `Exhaustion - whether physical or emotional - is really draining. It's hard to function when your energy is depleted.

Consider:
• Are you able to get some rest, even a short break?
• Sometimes "tired" is actually our body asking for something - water, food, or emotional support
• It's okay to do less when you're running on empty

What do you think your body and mind need most right now?`;
  }

  // Default supportive response
  return `Thank you for sharing that with me. I want you to know that whatever you're going through, your feelings are valid.

I'm here to listen and support you. Can you tell me more about what's on your mind? The more you share, the better I can understand and help you work through it.

Remember: taking the time to reflect on your feelings is already a positive step.`;
}

export async function getCoachResponse(
  messages: CoachChatMessage[],
  apiKey: string
): Promise<string> {
  // Get the latest user message for fallback
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  // If no API key, use fallback
  if (!apiKey) {
    if (lastUserMessage) {
      return getCoachFallbackResponse(lastUserMessage.content);
    }
    throw new Error('API_KEY_REQUIRED');
  }

  // Check for crisis in the latest user message
  let systemPrompt = COACH_SYSTEM_PROMPT;
  if (lastUserMessage) {
    const crisisCheck = detectCrisis(lastUserMessage.content);
    if (crisisCheck.isCrisis && crisisCheck.severity === 'immediate') {
      // Append crisis context to system prompt
      systemPrompt += '\n\nIMPORTANT: The user is expressing thoughts of suicide or self-harm. Respond with immediate empathy, validate their pain, and strongly encourage professional crisis support. Prioritize their safety above all else.';
    }
  }

  // Filter out any system messages from chat history and map roles correctly
  const chatMessages: ClaudeMessage[] = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

  console.log('Coach API - Using Claude Sonnet 4.5');
  console.log('Coach API - Messages:', JSON.stringify(chatMessages, null, 2));

  try {
    const content = await callClaudeAPI(
      chatMessages,
      systemPrompt,
      apiKey,
      {
        maxTokens: 500, // Keep responses concise
        temperature: 0.8,
        enableThinking: false,
      }
    );

    console.log('Coach API - Success, response length:', content.length);
    return content;
  } catch (error) {
    console.error('Coach API error - FALLING BACK TO LOCAL:', error);
    // Fall back to pattern-based response when API fails
    if (lastUserMessage) {
      console.log('Using fallback coach response for:', lastUserMessage.content.slice(0, 50));
      return getCoachFallbackResponse(lastUserMessage.content);
    }
    throw error;
  }
}

// AI-powered task micro-chunking for executive function support
export interface GeneratedStep {
  text: string;
  estimatedMinutes: number;
}

const MICRO_CHUNK_SYSTEM_PROMPT = `You are an executive function coach specializing in helping people with ADHD and task paralysis. Your job is to break down tasks into tiny, ultra-specific micro-steps that take 2-5 minutes each.

PRINCIPLES FOR MICRO-CHUNKING:
1. Each step must be a SINGLE, CONCRETE action (not multiple actions)
2. Use specific action verbs: "Open", "Type", "Click", "Write", "Pick up", "Move"
3. Include the EXACT starting point: "Open the email app" not "Check emails"
4. Remove ALL ambiguity - someone should know EXACTLY what to do
5. No decisions required within a step - decisions are separate steps
6. Physical actions before mental ones when possible
7. Include "transition" steps: "Stand up from chair", "Walk to kitchen"

STEP COUNT BASED ON RESISTANCE:
- Low resistance (1-3): 3-4 steps
- Medium resistance (4-6): 4-5 steps
- High resistance (7-8): 5-6 steps
- Very high resistance (9-10): 6-8 steps (more granular)

EXAMPLES OF GOOD MICRO-STEPS:
- "Open laptop lid" (not "Start working")
- "Type recipient's email address in To field" (not "Write email")
- "Set phone timer for 10 minutes" (not "Work for a bit")
- "Write ONE sentence describing the problem" (not "Write introduction")

Respond with JSON only:
{"steps": [{"text": "step description", "estimatedMinutes": 2}, ...]}`;

export async function generateMicroSteps(
  title: string,
  description: string | undefined,
  resistance: number,
  apiKey: string
): Promise<GeneratedStep[]> {
  if (!apiKey) {
    throw new Error('API_KEY_REQUIRED');
  }

  const taskContext = description
    ? `Task: ${title}\nDetails: ${description}`
    : `Task: ${title}`;

  const content = await callClaudeAPI(
    [{ role: 'user', content: `Break down this task into micro-steps. Resistance level: ${resistance}/10\n\n${taskContext}` }],
    MICRO_CHUNK_SYSTEM_PROMPT,
    apiKey,
    { maxTokens: 2048, temperature: 0.7 }
  );

  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.steps || !Array.isArray(parsed.steps)) {
    throw new Error('Invalid steps format');
  }

  // Validate and normalize steps
  return parsed.steps.map((step: { text?: string; estimatedMinutes?: number }) => ({
    text: String(step.text || '').trim(),
    estimatedMinutes: Math.min(Math.max(Number(step.estimatedMinutes) || 3, 1), 10),
  })).filter((step: GeneratedStep) => step.text.length > 0);
}

// AI-powered task prioritization
export interface PrioritizedTask {
  taskId: number;
  title: string;
  score: number; // 0-100, higher = more urgent/important
  reasoning: string;
  suggestedAction: 'do_now' | 'schedule' | 'break_down' | 'defer' | 'quick_win';
  tags: string[];
}

export interface PrioritizationContext {
  currentEnergy: number; // 1-5
  timeAvailable: number; // minutes
  currentHour: number;
}

interface TaskForPrioritization {
  id?: number;
  title: string;
  description?: string;
  deadline?: Date;
  resistance: number;
  estimatedMinutes?: number;
  steps: { completed: boolean }[];
  status: string;
}

/**
 * Prioritize tasks using AI analysis
 */
const PRIORITIZATION_PROMPT = `You are an executive function coach helping someone with ADHD prioritize their tasks. Consider:
1. Deadlines (urgent tasks first)
2. Resistance level (high resistance needs peak energy)
3. Current energy level (1-5 scale)
4. Available time
5. Quick wins (low resistance, short tasks) for momentum

Respond with JSON array:
[{
  "index": 0,
  "score": 85,
  "reasoning": "short explanation",
  "suggestedAction": "do_now|schedule|break_down|defer|quick_win",
  "tags": ["urgent", "easy", "important", etc]
}]

Actions:
- do_now: Perfect for current energy/time
- schedule: Important but not right now
- break_down: Too overwhelming, needs smaller steps
- defer: Can wait, low priority
- quick_win: Easy task to build momentum`;

export async function prioritizeTasks(
  tasks: TaskForPrioritization[],
  context: PrioritizationContext,
  apiKey: string
): Promise<PrioritizedTask[]> {
  // Filter only pending/in_progress tasks
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  if (activeTasks.length === 0) {
    return [];
  }

  // If no API key, use local prioritization
  if (!apiKey) {
    return localPrioritization(activeTasks, context);
  }

  try {
    const taskSummaries = activeTasks.map((t, i) => ({
      index: i,
      title: t.title,
      description: t.description || '',
      deadline: t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : null,
      resistance: t.resistance,
      estimatedMinutes: t.estimatedMinutes || 30,
      hasSteps: t.steps.length > 0,
      stepsCompleted: t.steps.filter(s => s.completed).length,
      totalSteps: t.steps.length,
    }));

    const content = await callClaudeAPI(
      [{
        role: 'user',
        content: `Prioritize these tasks:

Current energy: ${context.currentEnergy}/5
Time available: ${context.timeAvailable} minutes
Current time: ${context.currentHour}:00

Tasks:
${JSON.stringify(taskSummaries, null, 2)}`
      }],
      PRIORITIZATION_PROMPT,
      apiKey,
      { maxTokens: 2048, temperature: 0.5 }
    );

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((p: { index: number; score: number; reasoning: string; suggestedAction: string; tags: string[] }) => ({
      taskId: activeTasks[p.index].id!,
      title: activeTasks[p.index].title,
      score: p.score,
      reasoning: p.reasoning,
      suggestedAction: p.suggestedAction as PrioritizedTask['suggestedAction'],
      tags: p.tags || [],
    })).sort((a: PrioritizedTask, b: PrioritizedTask) => b.score - a.score);

  } catch (error) {
    console.error('AI prioritization failed, using local:', error);
    return localPrioritization(activeTasks, context);
  }
}

/**
 * Local prioritization fallback when API is unavailable
 */
function localPrioritization(
  tasks: TaskForPrioritization[],
  context: PrioritizationContext
): PrioritizedTask[] {
  const now = new Date();

  return tasks.map(task => {
    let score = 50; // Base score
    const tags: string[] = [];
    let suggestedAction: PrioritizedTask['suggestedAction'] = 'schedule';
    const reasons: string[] = [];

    // Deadline urgency
    if (task.deadline) {
      const daysUntil = (new Date(task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil < 0) {
        score += 30;
        tags.push('overdue');
        reasons.push('Overdue!');
      } else if (daysUntil < 1) {
        score += 25;
        tags.push('urgent');
        reasons.push('Due today');
      } else if (daysUntil < 3) {
        score += 15;
        tags.push('soon');
        reasons.push('Due soon');
      }
    }

    // Resistance vs energy match
    const resistanceVsEnergy = task.resistance - (context.currentEnergy * 2);
    if (resistanceVsEnergy > 3) {
      score -= 10;
      tags.push('hard');
      suggestedAction = 'break_down';
      reasons.push('High resistance, consider breaking down');
    } else if (resistanceVsEnergy < -2 && (task.estimatedMinutes || 30) <= 15) {
      score += 10;
      tags.push('quick-win');
      suggestedAction = 'quick_win';
      reasons.push('Quick win for momentum');
    }

    // Time fit
    if ((task.estimatedMinutes || 30) <= context.timeAvailable) {
      score += 5;
      if ((task.estimatedMinutes || 30) <= 10) {
        tags.push('short');
      }
    } else {
      score -= 5;
      reasons.push('May need more time');
    }

    // Has steps already broken down
    if (task.steps.length > 0) {
      const progress = task.steps.filter(s => s.completed).length / task.steps.length;
      if (progress > 0 && progress < 1) {
        score += 10;
        tags.push('in-progress');
        reasons.push('Already started');
      }
    }

    // Determine action
    if (score >= 70 && resistanceVsEnergy <= 2) {
      suggestedAction = 'do_now';
    } else if (task.resistance >= 7 && task.steps.length === 0) {
      suggestedAction = 'break_down';
    } else if (score < 40) {
      suggestedAction = 'defer';
    }

    return {
      taskId: task.id!,
      title: task.title,
      score: Math.min(100, Math.max(0, score)),
      reasoning: reasons.length > 0 ? reasons.join('. ') : 'Regular priority',
      suggestedAction,
      tags,
    };
  }).sort((a, b) => b.score - a.score);
}
