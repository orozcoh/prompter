interface Prompt {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
  category?: string;
}

interface PromptGalleryProps {
  prompts: Prompt[];
  selectedPrompt: Prompt | null;
  onSelectPrompt: (prompt: Prompt) => void;
}

export function PromptGallery({ prompts, selectedPrompt, onSelectPrompt }: PromptGalleryProps) {
  return (
    <div className="prompt-gallery">
      <h3>Select a Prompt Style</h3>

      {prompts.length === 0 ? (
        <div className="empty-state">
          <p>No prompts available</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`gallery-item ${selectedPrompt?.id === prompt.id ? 'selected' : ''}`}
            >
              <div className="gallery-image">
                <img src={prompt.imageUrl} alt={prompt.name} loading="lazy" />
              </div>
              <div className="gallery-info">
                <h4>{prompt.name}</h4>
                <p className="gallery-prompt">{prompt.prompt}</p>
              </div>
              <button
                className="button turn-into-btn"
                onClick={() => onSelectPrompt(prompt)}
                disabled={selectedPrompt?.id === prompt.id}
              >
                {selectedPrompt?.id === prompt.id ? 'Selected' : 'Turn Into'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
