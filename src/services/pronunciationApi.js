export const playWordAudio = async (word) => {
  const audioUrl = `https://api.dictionaryapi.dev/media/pronunciations/en/${word}.mp3`;
  try {
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error('Failed to play audio:', error);
  }
};
