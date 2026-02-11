"""
Stress detection using the pretrained StudentNet model.
"""

import torch
import torch.nn.functional as F
from transformers import AutoConfig, AutoModelForAudioClassification
from huggingface_hub import hf_hub_download
import importlib.util
from typing import Union, Tuple, Optional
import numpy as np

from .embedding_extractor import Wav2Vec2EmbeddingExtractor


class StressDetector:
    """Stress detection using StudentNet model with Wav2Vec2 embeddings."""
    
    def __init__(self, device: Optional[str] = None):
        """
        Initialize the stress detector.
        
        Args:
            device: Device to run inference on ('cuda', 'cpu', or None for auto-detect)
        """
        if device is None:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)
        
        self.repo_id = "forwarder1121/voice-based-stress-recognition"
        
        print(f"Initializing stress detector on {self.device}...")
        
        # Load the embedding extractor
        self.embedding_extractor = Wav2Vec2EmbeddingExtractor(device=str(self.device))
        
        # Load the StudentNet model
        print(f"Loading StudentNet model from {self.repo_id}...")
        self.config = AutoConfig.from_pretrained(self.repo_id, trust_remote_code=True)
        self.model = AutoModelForAudioClassification.from_pretrained(
            self.repo_id,
            trust_remote_code=True,
            torch_dtype="auto"
        ).to(self.device)
        self.model.eval()
        
        print("Stress detector initialized successfully!")
        print(f"Model expects {self.config.hidden_size if hasattr(self.config, 'hidden_size') else '512'}-dim embeddings")
    
    def predict_from_embedding(
        self, 
        embedding: torch.Tensor
    ) -> Tuple[str, float, dict]:
        """
        Predict stress from pre-computed embedding.
        
        Args:
            embedding: Wav2Vec2 embedding tensor of shape (512,) or (batch, 512)
            
        Returns:
            Tuple of (label, confidence, probabilities_dict)
        """
        # Ensure correct shape
        if embedding.dim() == 1:
            embedding = embedding.unsqueeze(0)  # (1, 512)
        
        embedding = embedding.to(self.device)
        
        with torch.no_grad():
            outputs = self.model(embedding)
            logits = outputs.logits
            probs = F.softmax(logits, dim=-1)
        
        # Get prediction
        pred_idx = torch.argmax(probs, dim=-1).item()
        confidence = probs[0, pred_idx].item()
        
        label = "stressed" if pred_idx == 1 else "not_stressed"
        
        prob_dict = {
            "not_stressed": probs[0, 0].item(),
            "stressed": probs[0, 1].item()
        }
        
        return label, confidence, prob_dict
    
    def predict_from_audio(
        self, 
        audio_path: str,
        aggregate: str = 'mean'
    ) -> Tuple[str, float, dict]:
        """
        Predict stress from audio file.
        
        Args:
            audio_path: Path to audio file
            aggregate: Aggregation method for embeddings ('mean', 'max', 'first', 'last')
            
        Returns:
            Tuple of (label, confidence, probabilities_dict)
        """
        # Extract embedding
        embedding = self.embedding_extractor.extract_embedding(audio_path, aggregate=aggregate)
        
        # Predict
        return self.predict_from_embedding(embedding)
    
    def predict_batch(
        self, 
        audio_paths: list[str],
        aggregate: str = 'mean'
    ) -> list[Tuple[str, float, dict]]:
        """
        Predict stress for a batch of audio files.
        
        Args:
            audio_paths: List of paths to audio files
            aggregate: Aggregation method for embeddings
            
        Returns:
            List of (label, confidence, probabilities_dict) tuples
        """
        results = []
        for audio_path in audio_paths:
            result = self.predict_from_audio(audio_path, aggregate=aggregate)
            results.append(result)
        return results
    
    def get_stress_score(self, audio_path: str, aggregate: str = 'mean') -> float:
        """
        Get stress probability score (0-1) for audio file.
        
        Args:
            audio_path: Path to audio file
            aggregate: Aggregation method for embeddings
            
        Returns:
            Stress probability (0 = not stressed, 1 = highly stressed)
        """
        _, _, prob_dict = self.predict_from_audio(audio_path, aggregate=aggregate)
        return prob_dict['stressed']
