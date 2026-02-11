"""
FastAPI Server for Stress Analysis Agent

Exposes the LangGraph stress agent as a REST API.
"""

from src.stress_detector import StressDetector
import os
import sys
import uuid
import tempfile
from datetime import datetime
from typing import Annotated, TypedDict, Optional, List
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

load_dotenv()

# Add stress module to path
stress_module_path = Path(__file__).parent.parent / "stress"
sys.path.insert(0, str(stress_module_path))


# Stress detector singleton (initialized at startup in lifespan)
stress_detector: Optional[StressDetector] = None


def get_stress_detector() -> StressDetector:
    """Get the stress detector instance (initialized at startup)."""
    if stress_detector is None:
        raise RuntimeError(
            "StressDetector not initialized. Server may not have started properly.")
    return stress_detector

# ============================================================================
# Stress Assessment Questions
# ============================================================================


STRESS_QUESTIONS = [
    "How would you rate your sleep quality over the past week? (1-10, where 1 is very poor and 10 is excellent)",
    "How often have you felt overwhelmed by your responsibilities lately?",
    "Have you experienced any physical symptoms like headaches, muscle tension, or fatigue recently?",
    "How would you describe your work-life balance right now?",
    "Are you able to take time for activities you enjoy? If so, how often?",
    # "How would you rate your ability to concentrate and focus on tasks? (1-10)",
    # "Have you noticed any changes in your eating habits or appetite?",
    # "How supported do you feel by friends, family, or colleagues?",
    # "What's one thing that's been causing you the most stress recently?",
    # "On a scale of 1-10, how stressed do you feel overall right now?"
]

# ============================================================================
# LangGraph State & Nodes
# ============================================================================


class State(TypedDict):
    """State for the stress analysis conversation."""
    messages: Annotated[list, add_messages]
    current_question_index: int
    answers: list[str]
    analysis_complete: bool
    user_name: str  # Store user's name for personalization
    llm_analysis: Optional[dict]  # Structured JSON analysis from LLM


def create_llm():
    """Create the Gemini LLM via OpenAI endpoint."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")

    return ChatOpenAI(
        model="gemini-2.0-flash",
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        temperature=0.7
    )


def introduction_node(state: State) -> dict:
    """Welcome the user and ask for their name."""
    intro_message = """Hey there! I'm so glad you're here.

I'm your Stress Analysis companion, and I want you to know that this is a safe space to share how you've been feeling lately.

Before we begin, I'd love to know — what's your name?"""

    return {
        "messages": [AIMessage(content=intro_message)],
        "current_question_index": -1,  # -1 means we're asking for name
        "answers": [],
        "analysis_complete": False,
        "user_name": ""
    }


def process_answer_node(state: State) -> dict:
    """Process the user's answer with empathy and ask the next question."""
    llm = create_llm()
    current_index = state["current_question_index"]
    answers = state["answers"].copy()
    user_name = state.get("user_name", "")

    # Get the last user message as the answer
    last_message = state["messages"][-1]
    user_answer = ""
    if isinstance(last_message, HumanMessage):
        user_answer = last_message.content

    # Handle name collection (current_index == -1)
    if current_index == -1:
        # Use LLM to extract the name from natural language response
        name_extraction_prompt = f"""Extract ONLY the person's name from this response. 
User's response: "{user_answer}"

Rules:
- Return ONLY the name, nothing else
- If they say "my name is Tanush" return "Tanush"
- If they say "I'm Sarah" return "Sarah"  
- If they just say "John" return "John"
- Capitalize the first letter
- No punctuation, no extra words"""

        name_messages = [
            SystemMessage(
                content="You extract names from text. Return only the name, nothing else."),
            HumanMessage(content=name_extraction_prompt)
        ]

        name_response = llm.invoke(name_messages)
        name = name_response.content.strip()

        greeting_prompt = f"""The user just introduced themselves. Their name is: {name}

Generate a warm, personalized greeting that:
1. Greets them by name
2. Briefly explains you'll ask about {len(STRESS_QUESTIONS)} aspects of their life (sleep, work, etc.)
3. Reassures them there's no judgment and no wrong answers
4. Transitions naturally to the first question about sleep quality

First question to ask: {STRESS_QUESTIONS[0]}

Keep it warm and conversational. Don't use markdown formatting.
Respond directly (no labels or prefixes)."""

        messages = [
            SystemMessage(
                content="You are an empathetic mental health assistant. Be warm, supportive, and conversational. Don't use markdown formatting."),
            HumanMessage(content=greeting_prompt)
        ]

        response = llm.invoke(messages)

        return {
            "messages": [AIMessage(content=response.content)],
            "current_question_index": 0,
            "answers": answers,
            "analysis_complete": False,
            "user_name": name
        }

    # Add the answer to answers list (only for actual questions)
    answers.append(user_answer)
    next_index = current_index + 1

    # Check if we have more questions
    if next_index < len(STRESS_QUESTIONS):
        # Use LLM to generate empathetic acknowledgment
        prompt = f"""You are a compassionate stress assessment assistant having a conversation with {user_name}.

The user just answered this question:
Question: {STRESS_QUESTIONS[current_index]}
Their answer: {user_answer}

Your task:
1. Acknowledge their response with genuine empathy (1-2 sentences)
2. If appropriate, provide a brief supportive comment or validation
3. Then smoothly transition to the next question

Next question to ask: {STRESS_QUESTIONS[next_index]}
(This is question {next_index + 1} of {len(STRESS_QUESTIONS)})

Guidelines:
- Address them by name ({user_name}) occasionally but not every time
- Be warm and conversational, not clinical
- Don't repeat their answer back verbatim
- Keep acknowledgment brief but meaningful
- Use natural transitions like "I appreciate you sharing that...", "That's really helpful to know...", "I understand..."
- End with the next question naturally woven in
- Don't use markdown formatting like ** or ## - speak naturally

Respond directly as the assistant (no labels or prefixes)."""

        messages = [
            SystemMessage(
                content="You are an empathetic mental health assistant. Be warm, supportive, and conversational. Don't use markdown formatting."),
            HumanMessage(content=prompt)
        ]

        response = llm.invoke(messages)

        return {
            "messages": [AIMessage(content=response.content)],
            "current_question_index": next_index,
            "answers": answers,
            "analysis_complete": False,
            "user_name": user_name
        }
    else:
        # All questions answered, move to analysis
        transition_prompt = f"""The user ({user_name}) just completed answering the final question of a stress assessment.

Final question: {STRESS_QUESTIONS[current_index]}
Their answer: {user_answer}

Generate a brief, warm acknowledgment of their final answer and let them know you're now going to analyze their responses. 
Address them by name. Keep it to 2-3 sentences. Be supportive and appreciative of their openness.
Don't use markdown formatting."""

        messages = [
            SystemMessage(
                content="You are an empathetic mental health assistant. Don't use markdown formatting."),
            HumanMessage(content=transition_prompt)
        ]

        response = llm.invoke(messages)

        return {
            "messages": [AIMessage(content=response.content)],
            "current_question_index": next_index,
            "answers": answers,
            "analysis_complete": True,
            "user_name": user_name
        }


def analysis_node(state: State) -> dict:
    """Analyze all answers and provide stress assessment in JSON format."""
    llm = create_llm()
    user_name = state.get("user_name", "there")

    # Build the analysis prompt
    qa_summary = "\n".join([
        f"Q{i+1}: {STRESS_QUESTIONS[i]}\nA{i+1}: {answer}"
        for i, answer in enumerate(state["answers"])
    ])

    analysis_prompt = f"""Analyze the stress levels from these questionnaire responses for {user_name}.

RESPONSES:
{qa_summary}

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{{
  "stress_score": <number 1-100>,
  "stress_level": "<Low|Moderate|High|Very High>",
  "key_indicators": ["<indicator1>", "<indicator2>", ...],
  "positive_factors": ["<factor1>", "<factor2>", ...],
  "recommendations": ["<rec1>", "<rec2>", "<rec3>"],
  "summary": "<2-3 sentence personalized summary for {user_name}>"
}}

Guidelines for stress_score:
- 1-25: Low stress
- 26-50: Moderate stress  
- 51-75: High stress
- 76-100: Very High stress"""

    messages = [
        SystemMessage(
            content="You are a stress analysis expert. Return ONLY valid JSON, no other text."),
        HumanMessage(content=analysis_prompt)
    ]

    response = llm.invoke(messages)

    # Parse JSON response
    import json
    try:
        # Try to extract JSON from response
        response_text = response.content.strip()
        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        analysis_data = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        analysis_data = {
            "stress_score": 50,
            "stress_level": "Moderate",
            "key_indicators": ["Unable to parse detailed analysis"],
            "positive_factors": [],
            "recommendations": ["Please try the assessment again"],
            "summary": f"Analysis could not be fully processed for {user_name}."
        }

    # Create conversational message for chat display
    final_message = f"""Hi {user_name}, here's your stress assessment:

Your stress score is {analysis_data['stress_score']}/100, indicating {analysis_data['stress_level']} stress levels.

{analysis_data['summary']}

Key indicators: {', '.join(analysis_data.get('key_indicators', [])[:3])}

Remember, this is not a medical diagnosis. If you're experiencing severe stress, please reach out to a healthcare professional."""

    return {
        "messages": [AIMessage(content=final_message)],
        "llm_analysis": analysis_data
    }


def should_continue(state: State) -> str:
    """Determine the next step in the conversation."""
    if state.get("analysis_complete", False):
        return "analyze"
    return "wait_for_input"


def route_entry(state: State) -> str:
    """Route based on current state."""
    if state["current_question_index"] == -2:
        # Initial state, show introduction
        return "introduction"
    elif state.get("analysis_complete", False):
        return "analysis"
    else:
        # Process answer (includes name collection when index == -1)
        return "process_answer"


def build_graph():
    """Build the LangGraph workflow."""
    graph = StateGraph(State)

    # Add nodes
    graph.add_node("introduction", introduction_node)
    graph.add_node("process_answer", process_answer_node)
    graph.add_node("analysis", analysis_node)

    # Route from START based on state
    graph.add_conditional_edges(
        START,
        route_entry,
        {
            "introduction": "introduction",
            "process_answer": "process_answer",
            "analysis": "analysis"
        }
    )

    # All nodes end after execution (waiting for user input)
    graph.add_edge("introduction", END)
    graph.add_conditional_edges(
        "process_answer",
        should_continue,
        {
            "analyze": "analysis",
            "wait_for_input": END
        }
    )
    graph.add_edge("analysis", END)

    return graph.compile()


# ============================================================================
# Session Management
# ============================================================================

# In-memory session storage (use Redis/DB in production)
sessions: dict[str, dict] = {}

graph = build_graph()


def get_or_create_session(session_id: Optional[str] = None) -> tuple[str, dict]:
    """Get existing session or create a new one."""
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]

    # Create new session
    new_id = str(uuid.uuid4())
    initial_state = {
        "messages": [],
        "current_question_index": -2,  # -2 = intro, -1 = name collection, 0+ = questions
        "answers": [],
        "analysis_complete": False,
        "user_name": "",
        "stress_readings": []  # Track voice stress readings
    }

    # Run introduction
    result = graph.invoke(initial_state)
    # Preserve stress_readings since LangGraph won't track it
    result["stress_readings"] = []
    sessions[new_id] = result

    return new_id, result


# ============================================================================
# API Models
# ============================================================================


class StartSessionResponse(BaseModel):
    session_id: str
    message: str
    question_number: int
    total_questions: int
    is_complete: bool


class SendMessageRequest(BaseModel):
    session_id: str
    message: str


class SendMessageResponse(BaseModel):
    message: str
    question_number: int
    total_questions: int
    is_complete: bool
    is_analysis: bool


class StressReading(BaseModel):
    timestamp: str
    question_number: int
    stress_score: float
    confidence: float
    label: str


class AnalyzeStressResponse(BaseModel):
    success: bool
    stress_score: float
    confidence: float
    label: str


class StressReportResponse(BaseModel):
    session_id: str
    user_name: str
    total_readings: int
    average_stress_score: Optional[float]
    stress_readings: List[StressReading]


class VoiceAnalysis(BaseModel):
    readings: List[StressReading]
    average_score: Optional[float]
    trend: str  # "stable", "increasing", "decreasing"


class LLMAnalysis(BaseModel):
    stress_score: int  # 1-100
    stress_level: str  # "Low", "Moderate", "High", "Very High"
    key_indicators: List[str]
    positive_factors: List[str]
    recommendations: List[str]
    summary: str


class ConversationAnalysis(BaseModel):
    questions: List[str]
    answers: List[str]
    llm_analysis: Optional[LLMAnalysis]


class EnsembleResult(BaseModel):
    overall_stress_level: str  # "Low", "Moderate", "High", "Very High"
    ensemble_score: int  # 1-100 combined score
    voice_stress_score: Optional[int]  # 1-100 (voice)
    text_stress_score: Optional[int]  # 1-100 (LLM)
    confidence: float
    key_indicators: List[str]


class ComprehensiveReportResponse(BaseModel):
    session_id: str
    user_name: str
    voice_analysis: VoiceAnalysis
    conversation_analysis: ConversationAnalysis
    ensemble_result: EnsembleResult


# ============================================================================
# FastAPI App
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global stress_detector
    print("Starting Stress Analysis Agent Server...")

    # Load stress detection model at startup
    print("Loading voice stress detection model...")
    stress_detector = StressDetector()
    print("Voice stress detection model loaded successfully!")

    yield

    print("Shutting down...")
    stress_detector = None
    sessions.clear()


app = FastAPI(
    title="Stress Analysis Agent API",
    description="An empathetic AI agent for stress analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/start", response_model=StartSessionResponse)
async def start_session():
    """Start a new stress analysis session."""
    try:
        session_id, state = get_or_create_session()

        # Get the introduction message
        ai_messages = [msg for msg in state["messages"]
                       if isinstance(msg, AIMessage)]
        intro_message = ai_messages[-1].content if ai_messages else ""

        return StartSessionResponse(
            session_id=session_id,
            message=intro_message,
            question_number=0,  # 0 = asking for name
            total_questions=len(STRESS_QUESTIONS),
            is_complete=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """Send a message to the stress analysis agent."""
    try:
        if request.session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        state = sessions[request.session_id]

        # Check if already complete
        if state.get("analysis_complete", False) and state["current_question_index"] >= len(STRESS_QUESTIONS):
            # Already analyzed, just return the last message
            ai_messages = [msg for msg in state["messages"]
                           if isinstance(msg, AIMessage)]
            return SendMessageResponse(
                message=ai_messages[-1].content if ai_messages else "",
                question_number=len(STRESS_QUESTIONS),
                total_questions=len(STRESS_QUESTIONS),
                is_complete=True,
                is_analysis=True
            )

        # Add user message
        state["messages"] = list(state["messages"]) + \
            [HumanMessage(content=request.message)]

        # Preserve stress_readings before graph invocation
        stress_readings = state.get("stress_readings", [])

        # Invoke graph
        result = graph.invoke(state)

        # Restore stress_readings (not tracked by LangGraph)
        result["stress_readings"] = stress_readings
        sessions[request.session_id] = result

        # Get the latest AI message
        ai_messages = [msg for msg in result["messages"]
                       if isinstance(msg, AIMessage)]
        response_message = ai_messages[-1].content if ai_messages else ""

        # Calculate question number (0 = name collected, 1+ = questions)
        current_idx = result["current_question_index"]
        current_q = max(0, min(current_idx + 1, len(STRESS_QUESTIONS)))
        is_analysis = result.get(
            "analysis_complete", False) and current_idx >= len(STRESS_QUESTIONS)

        return SendMessageResponse(
            message=response_message,
            question_number=current_q,
            total_questions=len(STRESS_QUESTIONS),
            is_complete=is_analysis,
            is_analysis=is_analysis
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/analyze-stress", response_model=AnalyzeStressResponse)
async def analyze_stress(
    session_id: str = Form(...),
    audio: UploadFile = File(...)
):
    """Analyze stress from voice audio."""
    try:
        # Create debug audio directory
        debug_dir = Path(__file__).parent / "debug_audio"
        debug_dir.mkdir(exist_ok=True)

        # Save audio with timestamp for inspection
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        debug_path = debug_dir / f"audio_{timestamp}.wav"

        content = await audio.read()
        debug_path.write_bytes(content)
        print(f"[Stress] Saved audio: {debug_path} ({len(content)} bytes)")

        try:
            # Log audio file info
            import soundfile as sf
            info = sf.info(str(debug_path))
            print(
                f"[Stress] Audio info: {info.samplerate}Hz, {info.duration:.2f}s, {info.channels}ch")

            # Get stress prediction
            detector = get_stress_detector()
            label, confidence, probs = detector.predict_from_audio(
                str(debug_path))
            stress_score = probs["stressed"]
            print(
                f"[Stress] Prediction: {label} ({stress_score:.3f}), confidence={confidence:.3f}")

            # Store reading if session exists (graceful if session is stale)
            if session_id in sessions:
                state = sessions[session_id]
                current_question = max(0, state.get(
                    "current_question_index", 0) + 1)
                reading = {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "question_number": current_question,
                    "stress_score": stress_score,
                    "confidence": confidence,
                    "label": label
                }

                print(f"Stress reading: {reading}")

                if "stress_readings" not in state:
                    state["stress_readings"] = []
                state["stress_readings"].append(reading)
                sessions[session_id] = state
            else:
                print(
                    f"Session {session_id} not found, stress reading not stored")

            return AnalyzeStressResponse(
                success=True,
                stress_score=stress_score,
                confidence=confidence,
                label=label
            )
        except Exception as inner_e:
            print(f"Error processing audio: {inner_e}")
            raise

    except Exception as e:
        print(f"Error analyzing stress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/stress-report", response_model=StressReportResponse)
async def get_stress_report(session_id: str):
    """Get accumulated stress readings for a session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    state = sessions[session_id]
    stress_readings = state.get("stress_readings", [])

    # Calculate average stress score
    avg_score = None
    if stress_readings:
        avg_score = sum(r["stress_score"]
                        for r in stress_readings) / len(stress_readings)

    return StressReportResponse(
        session_id=session_id,
        user_name=state.get("user_name", ""),
        total_readings=len(stress_readings),
        average_stress_score=avg_score,
        stress_readings=[StressReading(**r) for r in stress_readings]
    )


@app.get("/api/session/{session_id}/comprehensive-report", response_model=ComprehensiveReportResponse)
async def get_comprehensive_report(session_id: str):
    """Get comprehensive stress analysis combining voice and conversation data."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    state = sessions[session_id]
    stress_readings = state.get("stress_readings", [])
    answers = state.get("answers", [])
    user_name = state.get("user_name", "")
    llm_analysis_data = state.get("llm_analysis", None)

    # Voice Analysis - convert 0-1 to 1-100 scale
    voice_score_100 = None
    trend = "stable"
    if stress_readings:
        scores = [r["stress_score"] for r in stress_readings]
        avg_voice_score = sum(scores) / len(scores)
        voice_score_100 = int(avg_voice_score * 100)

        # Calculate trend
        if len(scores) >= 2:
            first_half = sum(scores[:len(scores)//2]) / \
                (len(scores)//2) if len(scores)//2 > 0 else 0
            second_half = sum(scores[len(scores)//2:]) / \
                (len(scores) - len(scores)//2)
            diff = second_half - first_half
            if diff > 0.1:
                trend = "increasing"
            elif diff < -0.1:
                trend = "decreasing"
            else:
                trend = "stable"

    voice_analysis = VoiceAnalysis(
        readings=[StressReading(**r) for r in stress_readings],
        average_score=voice_score_100 / 100 if voice_score_100 else None,
        trend=trend
    )

    # LLM Analysis
    llm_analysis = None
    text_score_100 = None
    if llm_analysis_data:
        text_score_100 = llm_analysis_data.get("stress_score", 50)
        llm_analysis = LLMAnalysis(
            stress_score=text_score_100,
            stress_level=llm_analysis_data.get("stress_level", "Moderate"),
            key_indicators=llm_analysis_data.get("key_indicators", []),
            positive_factors=llm_analysis_data.get("positive_factors", []),
            recommendations=llm_analysis_data.get("recommendations", []),
            summary=llm_analysis_data.get("summary", "")
        )

    conversation_analysis = ConversationAnalysis(
        questions=STRESS_QUESTIONS[:len(answers)],
        answers=answers,
        llm_analysis=llm_analysis
    )

    # Ensemble Result - combine voice and text scores
    # Weight: 40% voice, 60% text (text has more context)
    ensemble_score = 50  # default
    if voice_score_100 is not None and text_score_100 is not None:
        ensemble_score = int(0.4 * voice_score_100 + 0.6 * text_score_100)
    elif voice_score_100 is not None:
        ensemble_score = voice_score_100
    elif text_score_100 is not None:
        ensemble_score = text_score_100

    # Determine overall level from ensemble score
    if ensemble_score <= 25:
        overall_stress_level = "Low"
    elif ensemble_score <= 50:
        overall_stress_level = "Moderate"
    elif ensemble_score <= 75:
        overall_stress_level = "High"
    else:
        overall_stress_level = "Very High"

    # Calculate confidence based on data availability
    confidence = 0.5
    if stress_readings and llm_analysis_data:
        confidence = 0.9  # Both data sources
    elif stress_readings or llm_analysis_data:
        confidence = 0.7  # Only one data source

    # Combine key indicators from both sources
    key_indicators = []
    if llm_analysis:
        key_indicators.extend(llm_analysis.key_indicators[:3])
    if voice_score_100 is not None and voice_score_100 > 60:
        key_indicators.append("Elevated voice stress markers")
    if trend == "increasing":
        key_indicators.append("Stress increased during session")
    elif trend == "decreasing":
        key_indicators.append("Stress decreased during session")

    ensemble_result = EnsembleResult(
        overall_stress_level=overall_stress_level,
        ensemble_score=ensemble_score,
        voice_stress_score=voice_score_100,
        text_stress_score=text_score_100,
        confidence=confidence,
        key_indicators=key_indicators if key_indicators else [
            "No significant indicators detected"]
    )

    return ComprehensiveReportResponse(
        session_id=session_id,
        user_name=user_name,
        voice_analysis=voice_analysis,
        conversation_analysis=conversation_analysis,
        ensemble_result=ensemble_result
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
