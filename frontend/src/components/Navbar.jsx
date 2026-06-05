export default function Navbar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-sidebar border border-border rounded-xl p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
            ${active === tab ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
