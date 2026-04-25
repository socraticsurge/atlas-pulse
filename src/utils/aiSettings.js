const STORAGE_KEY = 'atlas-pulse-ai-settings';

export const PERSONAS = [
  {
    id: 'analyst',
    label: 'Analyst',
    emoji: '📊',
    desc: 'Data & patterns',
    lens: 'Apply rigorous analytical thinking — find patterns, examine evidence carefully, draw logical conclusions, and identify what the data actually shows versus what is merely claimed.',
  },
  {
    id: 'journalist',
    label: 'Journalist',
    emoji: '📰',
    desc: 'Newsworthy & punchy',
    lens: 'Write with journalistic clarity — lead with what matters most, cut all filler, surface what is genuinely newsworthy, and never bury the lede.',
  },
  {
    id: 'executive',
    label: 'Executive',
    emoji: '💼',
    desc: 'Bottom line first',
    lens: 'Think like a C-suite executive — lead with the bottom line, focus on strategic implications and competitive dynamics, and clarify what decisions this information should inform.',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    emoji: '🎓',
    desc: 'Clear & intuitive',
    lens: 'Explain like a great teacher — make complex ideas genuinely accessible, build intuition through concrete analogies, and highlight what is most worth understanding deeply.',
  },
  {
    id: 'skeptic',
    label: 'Skeptic',
    emoji: '🔍',
    desc: 'Questions everything',
    lens: 'Apply critical scrutiny — question assumptions, identify potential biases or conflicts of interest, steelman the counterarguments, and note what is missing, unverified, or conveniently omitted.',
  },
  {
    id: 'satirist',
    label: 'Satirist',
    emoji: '🎭',
    desc: 'Wit & irony',
    lens: 'Bring dry wit and sharp observation — find the irony, the absurdity, and the unexpected angles that others miss. Be incisive without losing the substance.',
  },
  {
    id: 'technologist',
    label: 'Technologist',
    emoji: '⚡',
    desc: 'Technical depth',
    lens: 'View this through a technical lens — examine the underlying technology, engineering tradeoffs, scalability implications, and what this means for developers, architects, and the broader tech industry.',
  },
  {
    id: 'lawyer',
    label: 'Lawyer',
    emoji: '⚖️',
    desc: 'Risk & precedent',
    lens: 'Think like a seasoned lawyer — examine legal precedent, identify regulatory and compliance implications, weigh liabilities and risks, and flag what is contractually, legally, or jurisdictionally significant.',
  },
  {
    id: 'philosopher',
    label: 'Philosopher',
    emoji: '🏛️',
    desc: 'Socratic & first principles',
    lens: 'Engage Socratically — question first principles, examine the assumptions underneath the assumptions, probe the deeper ethical and existential implications, and ask what this really reveals about the human condition or our values as a society.',
  },
];

export const TONE_GROUPS = [
  {
    label: 'Voice',
    tones: [
      { id: 'neutral',     label: 'Neutral',      instruction: 'Be balanced, measured, and objective.' },
      { id: 'formal',      label: 'Formal',        instruction: 'Use polished, professional language — precise and authoritative.' },
      { id: 'casual',      label: 'Casual',        instruction: 'Write conversationally, as if talking to a thoughtful friend over coffee.' },
      { id: 'sharp',       label: 'Sharp',         instruction: 'Be surgically direct and concise — cut every word that does not earn its place.' },
    ],
  },
  {
    label: 'Energy',
    tones: [
      { id: 'enthusiastic', label: 'Enthusiastic', instruction: 'Bring genuine energy and excitement — let your enthusiasm for the ideas come through.' },
      { id: 'playful',      label: 'Playful',      instruction: 'Keep it light and fun — use wordplay, levity, and wit while retaining substance.' },
      { id: 'urgent',       label: 'Urgent',       instruction: 'Convey urgency — why this matters right now and what is at stake if ignored.' },
      { id: 'reflective',   label: 'Reflective',   instruction: 'Take a contemplative, unhurried approach — let ideas breathe and invite deeper thinking.' },
    ],
  },
  {
    label: 'Angle',
    tones: [
      { id: 'empathetic',   label: 'Empathetic',   instruction: 'Lead with human impact and emotional resonance — ground abstract ideas in lived experience.' },
      { id: 'provocative',  label: 'Provocative',  instruction: 'Be intellectually bold — challenge comfortable assumptions, stir thinking, and say what others are afraid to.' },
      { id: 'optimistic',   label: 'Optimistic',   instruction: 'Find the opportunity, the upside, and the reason for genuine hope.' },
      { id: 'cautionary',   label: 'Cautionary',   instruction: 'Emphasize risks, unintended consequences, and what could go badly wrong.' },
    ],
  },
];

export const ALL_TONES = TONE_GROUPS.flatMap((g) => g.tones);

export const DEFAULT_AI_SETTINGS = {
  personas: ['analyst'],
  tone: 'neutral',
  customInstructions: '',
};

export function getAISettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_AI_SETTINGS };
}

export function saveAISettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Injects persona lenses, tone instruction, and custom instructions
 * into a base system prompt string.
 */
export function buildSystemPrompt(basePrompt, settings) {
  const { personas = ['analyst'], tone = 'neutral', customInstructions = '' } = settings;

  const selectedPersonas = PERSONAS.filter((p) => personas.includes(p.id));
  const selectedTone = ALL_TONES.find((t) => t.id === tone) || ALL_TONES[0];

  let prompt = basePrompt;

  if (selectedPersonas.length === 1) {
    prompt += `\n\nPerspective: ${selectedPersonas[0].lens}`;
  } else if (selectedPersonas.length > 1) {
    prompt += `\n\nBlend the following perspectives naturally — do not label or separate them in your response, just let them inform a unified voice:\n`;
    selectedPersonas.forEach((p) => {
      prompt += `• ${p.label}: ${p.lens}\n`;
    });
  }

  prompt += `\n\nTone: ${selectedTone.instruction}`;

  if (customInstructions.trim()) {
    prompt += `\n\nAdditional instructions from the reader: ${customInstructions.trim()}`;
  }

  return prompt;
}
