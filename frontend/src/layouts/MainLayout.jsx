import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1">
        <Navbar />
        <div className="p-6 bg-gray-100 min-h-screen">
          <Outlet /> 
        </div>
      </div>
    </div>
  );
}
