"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, BarChartBig, ShieldCheck, PlayCircle } from "lucide-react";
import Link from 'next/link';

// Accept currentUser and onSelectVideo as props
interface AppSidebarProps {
  currentUser: any; // Use Firebase User type if available
  onSelectVideo: (videoId: string) => void;
  onSignInClick?: () => void;
}

const mockActivities = [
  { id: 'abc123', title: 'How to Learn React', thumbnail: 'https://img.youtube.com/vi/abc123/default.jpg' },
  { id: 'def456', title: 'Understanding TypeScript', thumbnail: 'https://img.youtube.com/vi/def456/default.jpg' },
  { id: 'ghi789', title: 'Next.js Crash Course', thumbnail: 'https://img.youtube.com/vi/ghi789/default.jpg' },
];

const AppSidebar: React.FC<AppSidebarProps> = ({ currentUser, onSelectVideo }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showActivities, setShowActivities] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleActivities = () => setShowActivities((prev) => !prev);

  const navItems = [
    { href: "#", icon: <Users size={isOpen ? 22 : 24} />, label: "Agents" },
    { href: "#", icon: <BarChartBig size={isOpen ? 22 : 24} />, label: "Analytics" },
  ];

  return (
    <div 
      className={`flex flex-col h-screen p-2 sm:p-3 bg-gray-800 text-white shadow-lg transition-all duration-300 ease-in-out ${isOpen ? 'w-56 sm:w-60' : 'w-16 sm:w-[76px]'}`}
    >
      {/* Toggle Button */}
      <div className={`flex mb-3 sm:mb-4 ${isOpen ? 'justify-end' : 'justify-center'}`}>
        <Button 
          onClick={toggleSidebar} 
          variant="ghost" 
          className="text-white hover:bg-gray-700 p-1.5 sm:p-2"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </Button>
      </div>

      {/* Upgrade Plan at the top with double spacing below */}
      <div className="mb-6">
        <Link href="#" legacyBehavior>
          <a 
            className={`flex items-center p-1.5 sm:p-2 space-x-2 sm:space-x-3 rounded-md transition-colors duration-150 ${isOpen ? 'hover:bg-gray-700' : 'justify-center hover:bg-gray-700'}`}
          >
            <ShieldCheck size={isOpen ? 22 : 24} />
            {isOpen && <span className="ml-1 sm:ml-2 text-sm sm:text-base whitespace-nowrap">Upgrade Plan</span>}
          </a>
        </Link>
        {isOpen && (
          <div className="text-xs text-gray-300 mt-1 ml-1">
            Unlock all features below by upgrading your plan.
          </div>
        )}
      </div>

      {/* Activities Section with normal spacing below */}
      <div className="mb-3">
        <button
          className={`flex items-center w-full px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors ${isOpen ? '' : 'justify-center'}`}
          onClick={toggleActivities}
          aria-label="Toggle activities section"
        >
          <PlayCircle size={isOpen ? 22 : 24} />
          {isOpen && <span className="ml-2 font-semibold">Activities</span>}
          {isOpen && <span className="ml-auto text-xs text-gray-400">{showActivities ? '−' : '+'}</span>}
        </button>
        {showActivities && isOpen && (
          <div className="mt-1 ml-2">
            {currentUser ? (
              <ul className="space-y-1">
                {mockActivities.map((activity) => (
                  <li key={activity.id}>
                    <button
                      className="flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                      onClick={() => onSelectVideo(activity.id)}
                    >
                      <img src={activity.thumbnail} alt="" className="h-7 w-10 rounded mr-2 object-cover" />
                      <span className="truncate text-xs">{activity.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-3">
                {/* No sign-in instruction, just empty or a minimal message if you want */}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href} legacyBehavior>
                <a className="flex items-center p-2 space-x-3 rounded-md hover:bg-gray-700 transition-colors duration-150">
                  {item.icon}
                  {isOpen && <span className="ml-2 whitespace-nowrap">{item.label}</span>}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AppSidebar;
