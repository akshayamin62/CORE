/** Renders a label with each word on its own line when there are 2+ words (saves horizontal space on mobile). */
export function VerticalWordsLabel({
  text,
  className = '',
  multiWordClassName = '',
}: {
  text: string;
  className?: string;
  multiWordClassName?: string;
}) {
  const words = text.trim().split(/\s+/);

  if (words.length >= 2) {
    return (
      <span className={`inline-flex flex-col leading-tight ${multiWordClassName}`}>
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>{word}</span>
        ))}
      </span>
    );
  }

  return <span className={className}>{text}</span>;
}
