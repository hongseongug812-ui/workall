interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ name, avatarUrl, size = 34, className = "" }: Props) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`avatar-img ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
