import { useMemo } from 'react';

const useSentencePositioning = (currentIndex, totalSentences, visibleCount) => {
  const positioning = useMemo(() => {
    // 计算可见范围
    let start = currentIndex - Math.floor(visibleCount / 2);
    let end = currentIndex + Math.floor(visibleCount / 2);

    // 处理边界条件
    if (start < 0) {
      end += Math.abs(start);
      start = 0;
    }
    if (end >= totalSentences) {
      start -= end - (totalSentences - 1);
      end = totalSentences - 1;
    }
    if (start < 0) {
      start = 0;
    }

    // 计算居中索引
    const centerIndex = Math.floor(visibleCount / 2);

    return {
      visibleRange: { start, end },
      centerIndex
    };
  }, [currentIndex, totalSentences, visibleCount]);

  return positioning;
};

export default useSentencePositioning;
