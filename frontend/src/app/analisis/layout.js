export const metadata = {
  title: 'Analisis Data | Dashboard',
  description: 'Platform analisis data ekonomi, kesehatan, dan pendidikan terintegrasi',
};

export default function AnalysisLayout({ children }) {
  return (
    <div className="analysis-layout">
      <main>{children}</main>
    </div>
  );
}