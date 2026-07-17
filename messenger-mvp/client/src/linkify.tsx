import { Fragment } from "react";

// content 문자열의 URL을 <a> 링크로 바꿔 렌더링한다.
// dangerouslySetInnerHTML을 쓰지 않고 React 노드로 분리해 XSS 위험 없이 처리.
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)'"\]])/g;

export function LinkifiedText({ text }: { text: string }) {
  const nodes: JSX.Element[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`t-${i}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    nodes.push(
      <a key={`l-${i}`} href={match[0]} target="_blank" rel="noopener noreferrer">
        {match[0]}
      </a>
    );
    i += 1;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t-${i}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return <>{nodes}</>;
}
