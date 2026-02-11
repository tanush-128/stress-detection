"""Stress detection from speech using StudentNet."""

from .embedding_extractor import Wav2Vec2EmbeddingExtractor
from .stress_detector import StressDetector

__all__ = ['Wav2Vec2EmbeddingExtractor', 'StressDetector']
