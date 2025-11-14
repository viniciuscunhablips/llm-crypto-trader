"""
LLM client module for Google Gemini.
"""

import logging
import json
import os
from typing import Dict, Any, Optional
from google import genai


class LLMClient:
    """Handles interactions with Google Gemini LLM."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash-exp"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model
        self.environment = os.getenv("ENVIRONMENT", "production").lower()

    def get_trading_decisions(self, prompt: str, system_prompt: str) -> Optional[Dict[str, Any]]:
        """Get trading decisions from LLM."""
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}"
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt
            )
            content = response.text.strip() if response.text is not None else ""

            # Verbose logging in development mode
            if self.environment == "development":
                logging.info(f"LLM Response: {content}")

            # Extract JSON
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end > start:
                json_str = content[start:end]
                decisions = json.loads(json_str)
                return decisions
            else:
                logging.error("No JSON found in LLM response")
                return None
        except Exception as e:
            logging.error(f"Error calling Gemini API: {e}")
            return None