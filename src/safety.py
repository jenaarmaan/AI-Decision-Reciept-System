import re
from typing import Dict, List, Tuple

class InjectionDetector:
    """
    Detects potential prompt injection attacks using heuristics and pattern matching.
    """
    
    # Common prompt injection patterns
    PATTERNS = {
        "instruction_override": [
            r"ignore (all )?previous instructions",
            r"disregard (all )?prior commands",
            r"system override",
            r"new instruction:",
            r"stop following your instructions",
        ],
        "jailbreak_attempts": [
            r"you are now (a|an) (unresticted|evil|rule-breaking)",
            r"DAN Mode enabled",
            r"stay in character",
            r"imagine you have no filters",
        ],
        "data_exfiltration": [
            r"output (the |your )?system prompt",
            r"reveal your internal (logic|instructions)",
            r"show me the (raw|hidden) text",
        ],
        "tool_manipulation": [
            r"run command:",
            r"delete all files",
            r"drop table",
            r"eval\(",
            r"exec\(",
        ]
    }

    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold

    def analyze_input(self, text: str) -> Dict:
        """
        Analyzes the input text for risks.
        Returns a dictionary with score, status, and detected flags.
        """
        if not text:
            return {"risk_score": 0.0, "status": "SAFE", "flags": []}

        text_lower = text.lower()
        detected_flags = []
        total_matches = 0

        for category, patterns in self.PATTERNS.items():
            category_matches = 0
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    category_matches += 1
                    detected_flags.append(category)
                    break # One match per category is enough for flagging
            total_matches += category_matches

        # Simple scoring logic: 
        # 0 matches = 0.0
        # 1 match = 0.4
        # 2 matches = 0.7
        # 3+ matches = 1.0
        risk_score = min(1.0, total_matches * 0.35) if total_matches > 0 else 0.0
        
        status = "SAFE"
        if risk_score > 0.7:
            status = "DANGEROUS"
        elif risk_score > 0.3:
            status = "SUSPICIOUS"

        return {
            "risk_score": float(round(risk_score, 2)),
            "status": status,
            "flags": list(set(detected_flags)),
            "timestamp_analyzed": None # To be filled by caller if needed
        }

# Singleton instance for easy access
detector = InjectionDetector()
