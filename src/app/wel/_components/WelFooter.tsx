/** ウェルネス媒体専用フッター */
export default function WelFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="wel-footer">
      <div className="wel-footer-inner">
        <p className="wel-footer-copy">© {year} 投資のKAWARA版.com</p>
      </div>
    </footer>
  );
}
