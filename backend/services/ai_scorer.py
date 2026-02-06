import os
import requests
import json
import re
from typing import List, Dict, Tuple
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
API_URL = "https://router.huggingface.co/v1/chat/completions"

class AIScorer:
    """
    Service to evaluate technical answers using LLM.
    """
    
    @staticmethod
    def evaluate_answer(
        question: str,
        answer: str,
        keywords: List[str] = []
    ) -> Dict:
        """
        Evaluates a single technical answer.
        
        Returns:
            {
                "quality_score": float,  # 0-7
                "reasoning": str,
                "stuffing_flag": bool
            }
        """
        if not answer or len(answer.strip()) < 5:
            return {
                "quality_score": 0.0,
                "reasoning": "Answer too short or empty",
                "stuffing_flag": False
            }

        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json"
        }

        prompt = f"""You are a strict technical interviewer. Evaluate this answer.

QUESTION: {question}
CANDIDATE ANSWER: {answer}
REQUIRED KEYWORDS (for reference): {', '.join(keywords)}

Your Task:
1. Rate "Conceptual Understanding" (0-7):
   - 0: Completely wrong or irrelevant.
   - 1-2: Vague, barely touches the topic.
   - 3-4: OK, but surface level.
   - 5-6: Good, clear explanation.
   - 7: Excellent, deep understanding.

2. Check for "Keyword Stuffing":
   - If the candidate just lists keywords without sentences or context, flag as TRUE.
   - Example stuffing: "React hooks uses state useEffect functional component." (Nonsense)

Output JSON ONLY:
{{
  "score": <integer_0_to_7>,
  "reasoning": "<short_sentence_explanation>",
  "is_stuffing": <boolean>
}}"""

        payload = {
            "model": "meta-llama/Llama-3.3-70B-Instruct",
            "messages": [
                {"role": "system", "content": "You are a technical evaluation engine. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 150,
            "temperature": 0.1
        }

        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=5)
            response.raise_for_status()
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Clean code blocks if present
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```', '', content)
            
            data = json.loads(content.strip())
            
            return {
                "quality_score": float(data.get("score", 0)),
                "reasoning": data.get("reasoning", "AI Evaluation"),
                "stuffing_flag": bool(data.get("is_stuffing", False))
            }
            
        except Exception as e:
            print(f"AI Scoring Error: {e}")
            return {
                "quality_score": 0.0,
                "reasoning": "AI Service Unavailable - Fallback to keywords",
                "stuffing_flag": False,
                "error": True
            }
