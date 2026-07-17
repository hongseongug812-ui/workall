import { Fragment } from "react";

// 메시지 본문의 URL은 링크로, @이름은 멘션 배지로 렌더링한다.
// dangerouslySetInnerHTML을 쓰지 않고 React 노드로 분리해 XSS 위험 없이 처리.
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)'"\]])/g;

function renderLinks(text: string, keyPrefix: string) {
  const nodes: JSX.Element[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    nodes.push(
      <a key={`${keyPrefix}-l${i}`} href={match[0]} target="_blank" rel="noopener noreferrer">
        {match[0]}
      </a>
    );
    i += 1;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

export function LinkifiedText({ text }: { text: string }) {
  return <>{renderLinks(text, "l")}</>;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMentionRegex(names: string[]) {
  const escaped = [...new Set(names.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (escaped.length === 0) return null;
  return new RegExp(`@(${escaped.join("|")})(?=[\\s.,!?)]|$)`, "g");
}

interface MessageContentProps {
  text: string;
  memberNames: string[];
  currentUserName: string;
}

// 링크 자동감지 + @멘션 하이라이트를 함께 적용해 메시지 본문을 렌더링한다.
export function MessageContent({ text, memberNames, currentUserName }: MessageContentProps) {
  const mentionRe = buildMentionRegex(memberNames);
  if (!mentionRe) return <LinkifiedText text={text} />;

  const nodes: JSX.Element[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  mentionRe.lastIndex = 0;
  while ((match = mentionRe.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(...renderLinks(text.slice(lastIndex, match.index), `m${i}`));
    }
    const name = match[1];
    nodes.push(
      <span key={`mention-${i}`} className={`mention ${name === currentUserName ? "mention-me" : ""}`}>
        @{name}
      </span>
    );
    i += 1;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(...renderLinks(text.slice(lastIndex), `mend`));
  }
  return <>{nodes}</>;
}
