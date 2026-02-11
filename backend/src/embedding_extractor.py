"""
Wav2Vec2 embedding extractor for stress detection.
Extracts 512-dim embeddings from raw audio using fairseq's Wav2Vec2-base model.
"""

import torch
import torchaudio
import numpy as np
import soundfile as sf
from scipy import signal
from typing import Union, Optional
import warnings


class Wav2Vec2EmbeddingExtractor:
    """Extract 512-dimensional embeddings from audio using Wav2Vec2-base."""

    def __init__(self, device: Optional[str] = None):
        """
        Initialize the Wav2Vec2 embedding extractor.

        Args:
            device: Device to run inference on ('cuda', 'cpu', or None for auto-detect)
        """
        if device is None:
            self.device = torch.device(
                'cuda' if torch.cuda.is_available() else 'cpu')
        else:
            self.device = torch.device(device)

        print(f"Loading Wav2Vec2-base model on {self.device}...")

        # Load the pretrained Wav2Vec2 base model
        bundle = torchaudio.pipelines.WAV2VEC2_BASE
        self.model = bundle.get_model().to(self.device)
        self.model.eval()
        self.sample_rate = bundle.sample_rate  # 16000 Hz

        print(
            f"Model loaded successfully (expected sample rate: {self.sample_rate} Hz)")
        print(f"Using CNN feature extractor output (512-dim) before transformer")

    def load_audio(self, audio_path: str) -> torch.Tensor:
        """
        Load and preprocess audio file using soundfile (avoids FFmpeg dependency).

        Args:
            audio_path: Path to audio file

        Returns:
            Audio waveform tensor (1, num_samples)
        """
        # Load audio using soundfile (no FFmpeg required)
        waveform, sr = sf.read(audio_path, dtype='float32')
        print(
            f"[Audio] Loaded: sr={sr}, shape={waveform.shape}, dtype={waveform.dtype}")

        # Convert to numpy if needed
        if not isinstance(waveform, np.ndarray):
            waveform = np.array(waveform, dtype=np.float32)

        # Handle stereo -> mono
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)
            print(f"[Audio] Converted to mono: {waveform.shape}")

        # Check audio stats
        max_val = np.max(np.abs(waveform))
        rms = np.sqrt(np.mean(waveform ** 2))
        print(f"[Audio] Stats: max={max_val:.4f}, rms={rms:.4f}")

        # Resample if necessary using scipy
        if sr != self.sample_rate:
            original_len = len(waveform)
            num_samples = int(len(waveform) * self.sample_rate / sr)
            waveform = signal.resample(waveform, num_samples)
            print(
                f"[Audio] Resampled {sr}Hz -> {self.sample_rate}Hz: {original_len} -> {num_samples} samples")

        # Convert to torch tensor with shape (1, num_samples)
        waveform = torch.from_numpy(waveform.astype(np.float32)).unsqueeze(0)
        print(
            f"[Audio] Final tensor: {waveform.shape}, range=[{waveform.min():.4f}, {waveform.max():.4f}]")

        return waveform

    def extract_embedding(
        self,
        audio_input: Union[str, torch.Tensor],
        aggregate: str = 'mean'
    ) -> torch.Tensor:
        """
        Extract 512-dim embedding from audio.

        Args:
            audio_input: Either path to audio file or waveform tensor (1, num_samples)
            aggregate: Aggregation method for temporal features ('mean', 'max', 'first', 'last')

        Returns:
            Embedding tensor of shape (512,) or (batch_size, 512)
        """
        # Load audio if path is provided
        if isinstance(audio_input, str):
            waveform = self.load_audio(audio_input)
        else:
            waveform = audio_input

        # Move to device
        waveform = waveform.to(self.device)

        # Extract features
        with torch.no_grad():
            # Use the CNN feature extractor output (512-dim) BEFORE transformer
            # This is what the StudentNet model expects!
            embedding, lengths = self.model.feature_extractor(
                waveform, length=None)
            # embedding shape: (batch, time, 512) - already in correct format!

            # Aggregate temporal dimension
            if aggregate == 'mean':
                embedding = torch.mean(embedding, dim=1)  # (batch, 512)
            elif aggregate == 'max':
                embedding = torch.max(embedding, dim=1)[0]  # (batch, 512)
            elif aggregate == 'first':
                embedding = embedding[:, 0, :]  # (batch, 512)
            elif aggregate == 'last':
                embedding = embedding[:, -1, :]  # (batch, 512)
            else:
                raise ValueError(f"Unknown aggregation method: {aggregate}")

        # Squeeze if single sample
        if embedding.shape[0] == 1:
            embedding = embedding.squeeze(0)  # (512,)

        return embedding

    def extract_batch(
        self,
        audio_paths: list[str],
        aggregate: str = 'mean'
    ) -> torch.Tensor:
        """
        Extract embeddings for a batch of audio files.

        Args:
            audio_paths: List of paths to audio files
            aggregate: Aggregation method for temporal features

        Returns:
            Batch of embeddings (batch_size, 512)
        """
        embeddings = []
        for path in audio_paths:
            emb = self.extract_embedding(path, aggregate=aggregate)
            embeddings.append(emb)

        return torch.stack(embeddings)
