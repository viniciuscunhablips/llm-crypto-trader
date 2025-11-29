"""
LLM client module for Google Gemini.
"""

import logging
import json
import os
import re
from typing import Dict, Any, Optional
from google import genai
from google.genai import types


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
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Lower temperature for more deterministic JSON
                )
            )
            content = response.text.strip() if response.text is not None else ""

            # Verbose logging in development mode
            if self.environment == "development":
                logging.info(f"LLM Response: {content}")

            # Extract JSON using regex to handle markdown code blocks
            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    decisions = json.loads(json_str)
                    return decisions
                except json.JSONDecodeError as e:
                    logging.error(f"Failed to parse JSON: {e}. Content: {json_str}")
                    return None
            else:
                logging.error(f"No JSON found in LLM response. Content: {content}")
                return None

        except Exception as e:
            logging.error(f"Error calling Gemini API: {e}")
            return None