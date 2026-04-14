"""
AI Insight Generation for books.

Generates (in a single API call per book):
  - Summary
  - Genre classification
  - Sentiment analysis
  - Recommendation tags

Supports: anthropic | openai | openrouter | lmstudio
"""

import json
import logging
import os
import time
from functools import lru_cache

logger = logging.getLogger(__name__)

# Ordered fallback list — tries each model if the previous is rate-limited
OPENROUTER_FALLBACK_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-12b-it:free",
    "google/gemma-3-27b-it:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "qwen/qwen3-coder:free",
    "google/gemma-3-4b-it:free",
]


def _get_provider() -> str:
    return os.getenv("AI_PROVIDER", "openrouter").lower()


@lru_cache(maxsize=1)
def _get_anthropic_client():
    import anthropic
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


@lru_cache(maxsize=1)
def _get_openai_client():
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))


@lru_cache(maxsize=1)
def _get_openrouter_client():
    from openai import OpenAI
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", ""),
    )


@lru_cache(maxsize=1)
def _get_lmstudio_client():
    from openai import OpenAI
    return OpenAI(
        base_url=os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1"),
        api_key="lm-studio",
    )


def _chat_openrouter(system: str, user: str, max_tokens: int) -> str:
    """
    Call OpenRouter with automatic model fallback.
    If a model is rate-limited (429), moves to the next model in the fallback list.
    """
    client = _get_openrouter_client()
    # Start with the model in .env, then fall through the list
    preferred = os.getenv("OPENROUTER_MODEL", OPENROUTER_FALLBACK_MODELS[0])
    models_to_try = [preferred] + [m for m in OPENROUTER_FALLBACK_MODELS if m != preferred]

    last_error = None
    for model in models_to_try:
        try:
            logger.info(f"Trying model: {model}")
            resp = client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                extra_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "BookSearch",
                },
            )
            content = resp.choices[0].message.content
            if not content:
                logger.warning(f"Model {model} returned empty content, trying next...")
                last_error = ValueError("Empty response content")
                time.sleep(3)
                continue
            return content.strip()

        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "rate" in err_str.lower():
                logger.warning(f"Model {model} rate-limited, trying next...")
                time.sleep(3)
                last_error = e
                continue
            # Non-rate-limit error — raise immediately
            raise

    raise RuntimeError(f"All OpenRouter models rate-limited. Last error: {last_error}")


def _chat(system: str, user: str, max_tokens: int = 600) -> str:
    """Send a chat completion to the configured provider."""
    provider = _get_provider()

    if provider == "anthropic":
        client = _get_anthropic_client()
        msg = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text.strip()

    elif provider == "openai":
        client = _get_openai_client()
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content.strip()

    elif provider == "openrouter":
        return _chat_openrouter(system, user, max_tokens)

    elif provider == "lmstudio":
        client = _get_lmstudio_client()
        resp = client.chat.completions.create(
            model="local-model",
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content.strip()

    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")


# ── Combined single-call insight generation ───────────────────────────────────

def generate_all_insights(title: str, description: str, genre: str = "") -> dict:
    """
    Generate all insights in ONE API call per book to stay within rate limits.

    Returns:
        {
            "summary": str,
            "ai_genre": str,
            "sentiment": str,           # positive | neutral | negative
            "sentiment_score": float,   # 0.0 – 1.0
            "recommendation_tags": list[str],
        }
    """
    logger.info(f"Generating AI insights for: {title}")

    if not description:
        return {
            "summary": "",
            "ai_genre": genre or "Fiction",
            "sentiment": "neutral",
            "sentiment_score": 0.5,
            "recommendation_tags": [],
        }

    system = (
        "You are a book analysis assistant. Given a book's title, genre, and description, "
        "return a JSON object with these exact keys:\n"
        "  summary        - 2-3 sentence engaging summary (string)\n"
        "  ai_genre       - single genre from: Fiction, Non-Fiction, Mystery, Thriller, "
        "Romance, Science Fiction, Fantasy, Horror, Biography, History, Self-Help, "
        "Children, Poetry, Classics, Crime, Adventure, Philosophy, Science (string)\n"
        "  sentiment      - overall tone: 'positive', 'neutral', or 'negative' (string)\n"
        "  sentiment_score - confidence 0.0 to 1.0 (number)\n"
        "  recommendation_tags - 3-5 short theme/mood tags useful for recommendations (array of strings)\n\n"
        "Respond with ONLY the JSON object, no extra text."
    )

    user = (
        f"Title: {title}\n"
        f"Genre: {genre or 'Unknown'}\n"
        f"Description: {description}"
    )

    raw = _chat(system, user, max_tokens=600)

    # Parse JSON — be tolerant of extra text around it
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])

        return {
            "summary": str(data.get("summary", "")).strip(),
            "ai_genre": str(data.get("ai_genre", genre or "Fiction")).strip(),
            "sentiment": str(data.get("sentiment", "neutral")).lower().strip(),
            "sentiment_score": float(data.get("sentiment_score", 0.5)),
            "recommendation_tags": [
                str(t).lower().strip()
                for t in data.get("recommendation_tags", [])
                if t
            ][:5],
        }

    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Could not parse insights JSON for '{title}': {e}\nRaw: {raw[:300]}")
        # Return safe defaults so the book isn't skipped entirely
        return {
            "summary": raw[:300] if raw else "",
            "ai_genre": genre or "Fiction",
            "sentiment": "neutral",
            "sentiment_score": 0.5,
            "recommendation_tags": [],
        }


# ── Individual helpers (kept for direct use if needed) ────────────────────────

def generate_summary(title: str, description: str, genre: str = "") -> str:
    return generate_all_insights(title, description, genre)["summary"]


def classify_genre(title: str, description: str) -> str:
    return generate_all_insights(title, description)["ai_genre"]


def analyze_sentiment(title: str, description: str) -> dict:
    r = generate_all_insights(title, description)
    return {"label": r["sentiment"], "score": r["sentiment_score"], "explanation": ""}
