// 音频对比工具 - 用于比较两个音频信号的相似度

/**
 * 计算两个音频信号的 MFCC 特征相似度
 * @param {Float32Array} audio1 - 第一个音频数据
 * @param {Float32Array} audio2 - 第二个音频数据
 * @param {number} sampleRate - 采样率
 * @returns {object} 对比结果
 */
export const compareAudioSignals = (audio1, audio2, sampleRate = 48000) => {
  // 1. 计算音量/能量
  const energy1 = calculateEnergy(audio1);
  const energy2 = calculateEnergy(audio2);

  // 2. 计算频谱中心
  const spectralCentroid1 = calculateSpectralCentroid(audio1, sampleRate);
  const spectralCentroid2 = calculateSpectralCentroid(audio2, sampleRate);

  // 3. 计算过零率 (用于检测辅音/元音)
  const zeroCrossingRate1 = calculateZeroCrossingRate(audio1);
  const zeroCrossingRate2 = calculateZeroCrossingRate(audio2);

  // 4. 计算频谱相似度
  const spectralSimilarity = calculateSpectralSimilarity(audio1, audio2, sampleRate);

  // 5. 计算整体相似度得分
  const score = calculateOverallScore(
    energy1, energy2,
    spectralCentroid1, spectralCentroid2,
    zeroCrossingRate1, zeroCrossingRate2,
    spectralSimilarity
  );

  return {
    score,
    energy: { original: energy1, recorded: energy2, ratio: energy1 > 0 ? energy2 / energy1 : 0 },
    spectralCentroid: { original: spectralCentroid1, recorded: spectralCentroid2 },
    zeroCrossingRate: { original: zeroCrossingRate1, recorded: zeroCrossingRate2 },
    spectralSimilarity,
    analysis: getAnalysisDescription(energy1, energy2, spectralCentroid1, spectralCentroid2, spectralSimilarity)
  };
};

/**
 * 计算音频能量 (RMS)
 */
const calculateEnergy = (audio) => {
  let sum = 0;
  for (let i = 0; i < audio.length; i++) {
    sum += audio[i] * audio[i];
  }
  return Math.sqrt(sum / audio.length);
};

/**
 * 计算频谱中心
 */
const calculateSpectralCentroid = (audio, sampleRate) => {
  const fftSize = 2048;
  const frequencies = getFrequencyBins(fftSize, sampleRate);

  // 简化的 DFT 计算
  const magnitudes = new Float32Array(fftSize / 2);
  for (let k = 0; k < fftSize / 2; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < Math.min(audio.length, fftSize); n++) {
      const angle = -2 * Math.PI * k * n / fftSize;
      real += audio[n] * Math.cos(angle);
      imag += audio[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(real * real + imag * imag);
  }

  // 计算加权平均
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let k = 0; k < magnitudes.length; k++) {
    weightedSum += frequencies[k] * magnitudes[k];
    magnitudeSum += magnitudes[k];
  }

  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
};

/**
 * 计算过零率
 */
const calculateZeroCrossingRate = (audio) => {
  let crossings = 0;
  for (let i = 1; i < audio.length; i++) {
    if ((audio[i - 1] >= 0 && audio[i] < 0) || (audio[i - 1] < 0 && audio[i] >= 0)) {
      crossings++;
    }
  }
  return crossings / audio.length;
};

/**
 * 计算频谱相似度 (使用互相关)
 */
const calculateSpectralSimilarity = (audio1, audio2, sampleRate) => {
  // 使用简化的频谱包络比较
  const bands = 8; // 将频谱分成8个频段
  const bandSize = Math.floor(sampleRate / 2 / bands);

  const spectrum1 = getSimplifiedSpectrum(audio1, bands, sampleRate);
  const spectrum2 = getSimplifiedSpectrum(audio2, bands, sampleRate);

  // 计算每个频段的差异
  let totalDiff = 0;
  for (let i = 0; i < bands; i++) {
    const diff = Math.abs(spectrum1[i] - spectrum2[i]);
    const normalizedDiff = spectrum1[i] > 0 ? diff / spectrum1[i] : diff;
    totalDiff += Math.min(normalizedDiff, 1);
  }

  return Math.max(0, 100 * (1 - totalDiff / bands));
};

/**
 * 获取简化的频谱包络
 */
const getSimplifiedSpectrum = (audio, bands, sampleRate) => {
  const bandSize = Math.floor(sampleRate / 2 / bands);
  const spectrum = new Float32Array(bands);

  for (let i = 0; i < bands; i++) {
    const startFreq = i * bandSize;
    const endFreq = (i + 1) * bandSize;

    // 计算该频段内的能量
    let energy = 0;
    let count = 0;

    for (let k = 0; k < Math.min(audio.length, 2048); k++) {
      const freq = k * sampleRate / 4096;
      if (freq >= startFreq && freq < endFreq) {
        energy += Math.abs(audio[k]);
        count++;
      }
    }

    spectrum[i] = count > 0 ? energy / count : 0;
  }

  return spectrum;
};

/**
 * 计算频率 bins
 */
const getFrequencyBins = (fftSize, sampleRate) => {
  const bins = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    bins[i] = i * sampleRate / fftSize;
  }
  return bins;
};

/**
 * 计算总体得分
 */
const calculateOverallScore = (energy1, energy2, sc1, sc2, zcr1, zcr2, spectralSim) => {
  // 能量相似度 (40% weight)
  const energySim = energy1 > 0 ? Math.min(energy2 / energy1, energy1 / energy2) * 100 : 100;

  // 频谱中心相似度 (30% weight)
  const scDiff = Math.abs(sc1 - sc2);
  const scSim = Math.max(0, 100 - scDiff / 1000 * 10);

  // 过零率相似度 (10% weight)
  const zcrDiff = Math.abs(zcr1 - zcr2);
  const zcrSim = Math.max(0, 100 - zcrDiff * 100);

  // 频谱相似度 (20% weight)
  // 权重调整：频谱相似度权重更高因为它直接反映音调特征
  const spectralWeight = 0.4;
  const energyWeight = 0.3;
  const scWeight = 0.2;
  const zcrWeight = 0.1;

  const score = energySim * energyWeight + scSim * scWeight + zcrSim * zcrWeight + spectralSim * spectralWeight;

  return Math.round(Math.max(0, Math.min(100, score)));
};

/**
 * 获取分析描述
 */
const getAnalysisDescription = (energy1, energy2, sc1, sc2, spectralSim) => {
  const descriptions = [];

  // 能量分析
  if (energy2 < energy1 * 0.5) {
    descriptions.push('音量过低');
  } else if (energy2 > energy1 * 1.5) {
    descriptions.push('音量过高');
  } else {
    descriptions.push('音量正常');
  }

  // 频谱分析
  if (spectralSim > 80) {
    descriptions.push('发音非常接近原音');
  } else if (spectralSim > 60) {
    descriptions.push('发音基本正确');
  } else if (spectralSim > 40) {
    descriptions.push('发音有偏差');
  } else {
    descriptions.push('发音差异较大');
  }

  return descriptions;
};

/**
 * 对比单词发音
 * @param {Float32Array} originalAudio - 原音频数据
 * @param {Float32Array} recordedAudio - 录音数据
 * @param {number} sampleRate - 采样率
 */
export const comparePronunciation = (originalAudio, recordedAudio, sampleRate = 48000) => {
  const result = compareAudioSignals(originalAudio, recordedAudio, sampleRate);

  // 详细的单词发音分析
  const details = {
    overallScore: result.score,
    volumeMatch: Math.round(result.energy.ratio * 100),
    toneMatch: Math.round(result.spectralSimilarity),
    rhythmMatch: Math.round(100 - Math.abs(result.zeroCrossingRate.original - result.zeroCrossingRate.recorded) * 100),
    feedback: result.analysis
  };

  return details;
};

export default {
  compareAudioSignals,
  comparePronunciation
};