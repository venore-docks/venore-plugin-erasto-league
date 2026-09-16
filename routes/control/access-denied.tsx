// Mesmo motivo de overlay/scoreboard.tsx e team-profile-view.tsx: rota standalone (fora de
// (platform)) não pode contar com as variáveis CSS do tema shadcn do host (--background,
// --foreground, etc. — só garantidas dentro da shell), então usa CSS própria em vez do
// <AdminAccessDenied> do host, pra não cair numa tela branca sem estilo.
const CSS = `
  html, body { margin: 0; background: radial-gradient(120% 140% at 50% -10%, #17202b 0%, #0b0f14 55%); }
  .el-cad-wrap {
    min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .el-cad-card {
    width: 100%; max-width: 360px; padding: 28px 24px; border-radius: 18px; text-align: center;
    background: linear-gradient(180deg, #171f29, #121821); border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 16px 34px -18px rgba(0,0,0,0.65);
  }
  .el-cad-title { color: #fff; font-size: 18px; font-weight: 800; margin: 0 0 8px; }
  .el-cad-message { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 20px; line-height: 1.5; }
  .el-cad-btn {
    display: inline-block; width: 100%; height: 44px; line-height: 44px; border-radius: 12px;
    background: #22c55e; color: #04170a; font-size: 14px; font-weight: 800; text-decoration: none;
  }
`;

export function ControlAccessDenied({ message }: { message: string }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="el-cad-wrap">
        <div className="el-cad-card">
          <p className="el-cad-title">Erasto League — controle</p>
          <p className="el-cad-message">{message}</p>
          <a className="el-cad-btn" href="/login">
            Fazer login
          </a>
        </div>
      </div>
    </>
  );
}
