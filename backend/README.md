# Stress Analysis Agent

A conversational AI agent built with **LangGraph** that analyzes user stress levels through a series of questions. Uses **Google Gemini** via OpenAI-compatible endpoint.

## Features

- 🧠 **10 Comprehensive Questions** - Covers sleep, work-life balance, physical symptoms, and more
- 🔄 **One-by-One Questioning** - Natural conversational flow
- 📊 **Personalized Analysis** - AI-powered stress assessment with recommendations
- 💚 **Empathetic Responses** - Supportive and constructive feedback

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API Key

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Run the Agent

```bash
python stress_agent.py
```

## How It Works

The agent uses LangGraph to manage conversation state and flow:

1. **Introduction Node** - Welcomes the user and presents the first question
2. **Process Answer Node** - Records answers and presents the next question
3. **Analysis Node** - Uses Gemini to analyze all responses and provide insights

```
┌─────────────┐     ┌─────────────────┐     ┌──────────┐
│ Introduction│ ──▶ │ Process Answer  │ ──▶ │ Analysis │
└─────────────┘     └─────────────────┘     └──────────┘
                           │  ▲
                           │  │ (loop until all 10 questions answered)
                           ▼  │
                      [User Input]
```

## Assessment Questions

The agent asks about:
- Sleep quality
- Feeling overwhelmed
- Physical symptoms
- Work-life balance
- Leisure activities
- Concentration ability
- Eating habits
- Social support
- Primary stressors
- Overall stress rating

## Output

After completing all questions, you receive:
- **Overall Stress Level** (Low / Moderate / High / Very High)
- **Key Stress Indicators**
- **Areas of Concern**
- **Positive Factors**
- **Personalized Recommendations**

## Note

⚠️ This tool is for informational purposes only and is not a substitute for professional medical or psychological advice. If you're experiencing severe stress or mental health concerns, please consult a healthcare professional.

