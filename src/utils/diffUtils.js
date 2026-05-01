/**
 * 单词级别 Diff 算法
 * 用于比较用户输入和原文，逐词标记正确/错误/缺失
 */

/**
 * 比较两个单词是否相同（忽略大小写和标点）
 */
const normalizeWord = (word) => {
  return word.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '');
};

/**
 * 判断两个单词是否匹配
 */
const wordsMatch = (word1, word2) => {
  return normalizeWord(word1) === normalizeWord(word2);
};

/**
 * 计算两个单词的相似度 (0-1)
 */
const similarity = (word1, word2) => {
  const w1 = normalizeWord(word1);
  const w2 = normalizeWord(word2);

  if (w1 === w2) return 1;

  // 简单的编辑距离计算
  const len1 = w1.length;
  const len2 = w2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = w1[i - 1] === w2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 删除
        matrix[i][j - 1] + 1,      // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
};

/**
 * 单词级别 diff
 * @param {string[]} originalWords - 原文单词数组
 * @param {string[]} userWords - 用户输入单词数组
 * @returns {Array} - Diff 结果数组
 */
export const wordLevelDiff = (originalWords, userWords) => {
  const results = [];

  // 使用简单的 LCS (最长公共子序列) 方法
  const m = originalWords.length;
  const n = userWords.length;

  // 构建 LCS 矩阵
  const lcs = [];
  for (let i = 0; i <= m; i++) {
    lcs[i] = new Array(n + 1).fill(0);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (wordsMatch(originalWords[i - 1], userWords[j - 1])) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // 回溯构建 diff 结果
  let i = m;
  let j = n;
  const diffResult = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && wordsMatch(originalWords[i - 1], userWords[j - 1])) {
      // 匹配
      diffResult.unshift({
        type: 'correct',
        original: originalWords[i - 1],
        user: userWords[j - 1],
        position: i - 1
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // 用户多输入了
      diffResult.unshift({
        type: 'extra',
        original: '',
        user: userWords[j - 1],
        position: -1
      });
      j--;
    } else {
      // 原文有，用户没输入
      diffResult.unshift({
        type: 'missing',
        original: originalWords[i - 1],
        user: '',
        position: i - 1
      });
      i--;
    }
  }

  return diffResult;
};

/**
 * 带相似度的智能 diff（用于显示替换）
 * @param {string[]} originalWords - 原文单词数组
 * @param {string[]} userWords - 用户输入单词数组
 * @param {number} threshold - 匹配阈值 (0-1)
 * @returns {Array} - Diff 结果数组
 */
export const smartWordDiff = (originalWords, userWords, threshold = 0.6) => {
  const results = [];

  let origIdx = 0;
  let userIdx = 0;

  while (origIdx < originalWords.length || userIdx < userWords.length) {
    // 所有原文已匹配完，用户还有多余输入
    if (origIdx >= originalWords.length) {
      results.push({
        type: 'extra',
        original: '',
        user: userWords[userIdx]
      });
      userIdx++;
      continue;
    }

    // 用户已全部输入，原文还有剩余
    if (userIdx >= userWords.length) {
      results.push({
        type: 'missing',
        original: originalWords[origIdx]
      });
      origIdx++;
      continue;
    }

    const origWord = originalWords[origIdx];
    const userWord = userWords[userIdx];
    const sim = similarity(origWord, userWord);

    if (sim === 1) {
      // 完全匹配
      results.push({
        type: 'correct',
        original: origWord,
        user: userWord
      });
      origIdx++;
      userIdx++;
    } else if (sim >= threshold) {
      // 相似（可能是拼写错误）
      results.push({
        type: 'wrong',
        original: origWord,
        user: userWord,
        similarity: sim
      });
      origIdx++;
      userIdx++;
    } else {
      // 尝试查找最近的匹配
      let foundMatch = false;
      let bestMatchIdx = -1;
      let bestSim = 0;

      // 在后续原文中查找可能的匹配
      for (let k = origIdx + 1; k < Math.min(origIdx + 3, originalWords.length); k++) {
        const s = similarity(originalWords[k], userWord);
        if (s >= threshold && s > bestSim) {
          bestSim = s;
          bestMatchIdx = k;
        }
      }

      if (bestMatchIdx !== -1) {
        // 中间有缺失的词
        for (let k = origIdx; k < bestMatchIdx; k++) {
          results.push({
            type: 'missing',
            original: originalWords[k]
          });
        }
        results.push({
          type: 'correct',
          original: originalWords[bestMatchIdx],
          user: userWord
        });
        origIdx = bestMatchIdx + 1;
        userIdx++;
      } else {
        // 用户可能输入了错误的词或顺序不对
        // 检查用户这个词在后面能否匹配
        let laterMatch = -1;
        for (let k = origIdx + 1; k < originalWords.length; k++) {
          if (similarity(originalWords[k], userWord) >= threshold) {
            laterMatch = k;
            break;
          }
        }

        if (laterMatch !== -1) {
          // 当前位置是错的，但后面有匹配
          results.push({
            type: 'wrong',
            original: origWord,
            user: userWord,
            similarity: sim
          });
          origIdx++;
          userIdx++;
        } else {
          // 用户多输入了一个词
          results.push({
            type: 'extra',
            original: '',
            user: userWord
          });
          userIdx++;
        }
      }
    }
  }

  return results;
};

/**
 * 统计 diff 结果
 */
export const getDiffStats = (diffResults) => {
  let correct = 0;
  let wrong = 0;
  let missing = 0;
  let extra = 0;

  for (const item of diffResults) {
    switch (item.type) {
      case 'correct':
        correct++;
        break;
      case 'wrong':
        wrong++;
        break;
      case 'missing':
        missing++;
        break;
      case 'extra':
        extra++;
        break;
    }
  }

  const total = correct + wrong + missing;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    correct,
    wrong,
    missing,
    extra,
    total,
    score
  };
};