import React, { useState, useEffect } from 'react';
import { 
  Home, User, Users, BookOpen, Library, Calendar, 
  Bell, HelpCircle, Settings, LogOut, Menu, X, Search, Moon, Sun
} from 'lucide-react';

export default function UserDashboardLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Check dark mode preference
    if (document.documentElement.classList.contains('dark')) {
      setDarkMode(true);
    }
    
    // Set date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString(undefined, options));
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { name: 'Dashboard', icon: Home, active: true },
    { name: 'My Profile', icon: User },
    { name: 'My Community', icon: Users },
    { name: 'Resources', icon: BookOpen },
    { name: 'Research Library', icon: Library },
    { name: 'Events', icon: Calendar },
    { name: 'Notifications', icon: Bell },
    { name: 'Support', icon: HelpCircle },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#030d0a]' : 'bg-[#F9FAFB]'} text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#071812] border-r border-[#0F382C]/10 dark:border-[#1E4E3D] z-50 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 lg:justify-start justify-between border-b border-[#0F382C]/10 dark:border-[#1E4E3D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F382C] to-[#65A30D] flex items-center justify-center text-white font-bold text-lg shadow-lg">
              H
            </div>
            <span className="font-bold text-lg text-[#0F382C] dark:text-white tracking-tight">HealerNet</span>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  item.active 
                    ? 'bg-emerald-50 dark:bg-[#112a20] text-[#0F382C] dark:text-[#A3E635]' 
                    : 'text-slate-600 dark:text-emerald-100/70 hover:bg-slate-50 dark:hover:bg-[#0a1f18] hover:text-[#0F382C] dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={item.active ? 'text-[#65A30D]' : ''} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#0F382C]/10 dark:border-[#1E4E3D]">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-white/80 dark:bg-[#071812]/80 backdrop-blur-md border-b border-[#0F382C]/10 dark:border-[#1E4E3D] sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-500 dark:text-emerald-100" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            
            <div className="hidden md:block">
              <h2 className="text-sm font-bold text-[#0F382C] dark:text-emerald-50">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name || 'Dr. Jenkins'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-emerald-200/60">{currentDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <input 
                type="text" 
                placeholder="Search resources, events..." 
                className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-100 dark:bg-[#0a1f18] border-none text-xs focus:ring-2 focus:ring-[#65A30D] outline-none placeholder-slate-400"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            </div>

            <button 
              onClick={toggleDarkMode}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#0a1f18] text-slate-600 dark:text-emerald-200 hover:bg-slate-200 dark:hover:bg-[#112a20] transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#0a1f18] text-slate-600 dark:text-emerald-200 hover:bg-slate-200 dark:hover:bg-[#112a20] transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#071812]" />
            </button>

            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-[#0a1f18] shadow-md ml-2 cursor-pointer">
              <img 
                src={user?.avatar || "https://i.pravatar.cc/150?u=sarah"} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
