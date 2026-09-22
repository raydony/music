import { Link } from 'react-router-dom';

export function PendingPage({ title }: { title: string }) {
  return (
    <div className="page pending-page">
      <p className="eyebrow">FANYINJI ARCHIVE</p>
      <h1>{title}</h1>
      <div className="pending-illustration" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>这一页正在整理中。先回首页，看看最近收录的声音。</p>
      <Link className="outline-button" to="/">
        返回首页 <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
