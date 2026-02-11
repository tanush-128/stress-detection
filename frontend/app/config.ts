const AGENT_BASE_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";
const TTS_BASE_URL = process.env.NEXT_PUBLIC_TTS_URL || "wss://services.insurgeai.com/tts";
const STT_BASE_URL = process.env.NEXT_PUBLIC_STT_URL || "wss://services.insurgeai.com/stt";

export { AGENT_BASE_URL, TTS_BASE_URL, STT_BASE_URL };
